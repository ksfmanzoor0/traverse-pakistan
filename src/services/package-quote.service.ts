import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { quotePackageAddons, type HomeCity } from "@/services/addon-cost.service";
import { quotePackageHotels } from "@/services/hotel-allocation.service";
import { listVehicleTypes, getEngineConfig } from "@/services/vehicle.service";

export type Tier = "deluxe" | "luxury" | "premium";

export type VehicleCode = "corolla" | "brv" | "prado" | "hiace" | "coaster";

export interface PublicPackageQuote {
  slug: string;
  duration: number;
  nights: number;
  tier: Tier;
  pax: number;           // adults + children_5_12 + children_2_5 (infants excluded — lap)
  adults: number;
  children_5_12: number;
  children_2_5: number;
  infants: number;
  rooms: number;         // rooms used in the allocation (the floor the UI clamps to)
  home: HomeCity;
  startDate: string;
  total: number;         // grand total for the whole party, post-margin
  perPerson: number;     // adult per-person (kept for backward-compat + main sidebar line)
  perAdult: number;
  perChild_5_12: number; // 0 when no such kids requested
  perChild_2_5: number;
  perInfant: number;
  unresolved: string[];
  vehicle: {
    code: VehicleCode;
    isNcp: boolean;
    count: number;
  } | null;
  flightPerPerson: number;
  flightTicketType: "return" | "oneway" | null;
}

interface VehicleAllocation {
  /** Number of Prados (NCP-eligible packages) or default-tier vehicles needed. */
  count: number;
  kmPerLitre: number;
  rentPerDay: number;
  code: VehicleCode;
  isNcp: boolean;
}

/**
 * Decide which vehicle to use and how many, mirroring the calculator's
 * applyPicker rules:
 *   - KDU/GIL packages → Prado NCP, replicate when pax > capacity
 *   - else → cheapest single type that fits all pax (Corolla → BRV → Hiace → Coaster)
 */
function planVehicles(
  vehicles: Awaited<ReturnType<typeof listVehicleTypes>>,
  pax: number,
  ncpEligible: boolean,
  luxuryDayTrip: boolean,
): VehicleAllocation | null {
  if (ncpEligible) {
    const ncp = vehicles.find((v) => v.isNcp && v.ncpPairCode === "prado");
    if (!ncp) return null;
    return {
      count: Math.max(1, Math.ceil(pax / Math.max(1, ncp.maxPeople))),
      kmPerLitre: ncp.kmPerLitre,
      rentPerDay: ncp.rentPerDay,
      code: "prado",
      isNcp: true,
    };
  }
  // Luxury tier on a single-day tour rides the non-NCP Prado, replicated by
  // capacity. Day-trips have no overnight to lift luxury above deluxe, so the
  // vehicle is the only luxury signal in the price.
  if (luxuryDayTrip) {
    const prado = vehicles.find((v) => v.code === "prado" && !v.isNcp);
    if (prado) {
      return {
        count: Math.max(1, Math.ceil(pax / Math.max(1, prado.maxPeople))),
        kmPerLitre: prado.kmPerLitre,
        rentPerDay: prado.rentPerDay,
        code: "prado",
        isNcp: false,
      };
    }
  }
  const order: VehicleCode[] = ["corolla", "brv", "hiace", "coaster"];
  for (const code of order) {
    const v = vehicles.find((x) => x.code === code);
    if (v && v.maxPeople >= pax) {
      return { count: 1, kmPerLitre: v.kmPerLitre, rentPerDay: v.rentPerDay, code, isNcp: false };
    }
  }
  const coaster = vehicles.find((v) => v.code === "coaster");
  if (!coaster) return null;
  return {
    count: Math.max(1, Math.ceil(pax / Math.max(1, coaster.maxPeople))),
    kmPerLitre: coaster.kmPerLitre,
    rentPerDay: coaster.rentPerDay,
    code: "coaster",
    isNcp: false,
  };
}

const LHE_EXTENSION_KM = 800;

/** Inner compute — call sites use the cached `quotePackage` wrapper. */
async function computeQuote(args: {
  slug: string;
  home: HomeCity;
  tier: Tier;
  pax: number;                    // legacy — treated as `adults` when adults not provided
  adults?: number;
  children_5_12?: number;
  children_2_5?: number;
  infants?: number;
  startDate: string;
  rooms?: number;
}): Promise<PublicPackageQuote | null> {
  const supabase = getSupabaseAdmin();
  const { data: pkgRow, error } = await supabase
    .from("packages")
    .select("slug, duration, starting_cities, total_distance_km, meals_per_person, entries_per_person, jeep_legs, fuel_price_per_litre, profit_percentage, guide_per_day")
    .eq("slug", args.slug)
    .maybeSingle();
  if (error) throw new Error(`quotePackage: ${error.message}`);
  if (!pkgRow) return null;

  const pkg = pkgRow as {
    slug: string;
    duration: number;
    starting_cities: string[] | null;
    total_distance_km: number | null;
    meals_per_person: number | null;
    entries_per_person: number | null;
    jeep_legs: Array<{ name: string; costPerJeep: number; capacity: number }> | null;
    fuel_price_per_litre: number | null;
    profit_percentage: number | null;
    guide_per_day: number | null;
  };

  const startingCities = pkg.starting_cities ?? [];
  const ncpEligible = startingCities.includes("KDU") || startingCities.includes("GIL");

  // Refuse to quote when the requested home isn't in starting_cities. This
  // prevents reprice from writing phantom prices into pricing.tier.home for
  // home cities the package can't actually be booked from — e.g. an ISB
  // price on a KHI-only day trip. Existing rows aren't deleted by this
  // (reprice only writes/overwrites — never deletes keys) — a one-time SQL
  // cleanup strips current phantoms. See memory engine-skip-unreachable-homes.
  // Empty starting_cities (legacy unseeded packages) keeps the prior behavior.
  // Normalize pax breakdown once. `pax` legacy arg is treated as adults when
  // adults not provided (keeps every existing caller working).
  const adults = Math.max(1, Math.floor(args.adults ?? args.pax));
  const children_5_12 = Math.max(0, Math.floor(args.children_5_12 ?? 0));
  const children_2_5 = Math.max(0, Math.floor(args.children_2_5 ?? 0));
  const infants = Math.max(0, Math.floor(args.infants ?? 0));
  const paxBillable = adults + children_5_12 + children_2_5; // vehicle capacity (infants on lap)

  if (startingCities.length > 0 && !startingCities.includes(args.home)) {
    return {
      slug: pkg.slug,
      duration: pkg.duration,
      nights: Math.max(1, pkg.duration - 1),
      tier: args.tier,
      pax: paxBillable,
      adults,
      children_5_12,
      children_2_5,
      infants,
      home: args.home,
      startDate: args.startDate,
      rooms: 0,
      total: 0,
      perPerson: 0,
      perAdult: 0,
      perChild_5_12: 0,
      perChild_2_5: 0,
      perInfant: 0,
      unresolved: [`Home ${args.home} not in starting_cities for ${pkg.slug}`],
      vehicle: null,
      flightPerPerson: 0,
      flightTicketType: null,
    };
  }

  // Refuse to price when drive distance is missing or non-positive. Either
  // case collapses the fuel line to zero and silently under-prices the trip,
  // which the cron would then snapshot over the previous price. Marking it
  // unresolved tells repriceAllPackages to leave packages.pricing untouched.
  if (
    pkg.total_distance_km === null
    || pkg.total_distance_km === undefined
    || pkg.total_distance_km <= 0
  ) {
    return {
      slug: pkg.slug,
      duration: pkg.duration,
      nights: Math.max(1, pkg.duration - 1),
      tier: args.tier,
      pax: paxBillable,
      adults,
      children_5_12,
      children_2_5,
      infants,
      home: args.home,
      startDate: args.startDate,
      rooms: 0,
      total: 0,
      perPerson: 0,
      perAdult: 0,
      perChild_5_12: 0,
      perChild_2_5: 0,
      perInfant: 0,
      unresolved: [`Package ${pkg.slug} has no positive total_distance_km — engine cannot compute transport cost.`],
      vehicle: null,
      flightPerPerson: 0,
      flightTicketType: null,
    };
  }
  const baseDistance = pkg.total_distance_km;
  // Hotel room capacity + party costs (transport, meals, entries, jeeps)
  // are borne by adults + older children (5-12). Under-5s share beds and
  // ride laps/seats without a paid share.
  const paxCostBearing = adults + children_5_12;

  const [flightQuote, hotelQuote, vehicles, engineConfig] = await Promise.all([
    quotePackageAddons({ packageSlug: args.slug, homeCity: args.home, startDate: args.startDate }),
    // Hotel allocation counts adults + older children (5-12) as bed-consuming.
    // Younger kids share beds. Infants are lap-free.
    quotePackageHotels({ packageSlug: args.slug, tier: args.tier, people: paxCostBearing, startDate: args.startDate, rooms: args.rooms, homeCity: args.home }),
    listVehicleTypes(),
    getEngineConfig(),
  ]);

  // LHE 800km road extension applies only when LHE drives (not flies). A
  // required flight addon for LHE means LHE flies to the canonical departure
  // (e.g. KDU on Skardu fly-ins, KHI on Gwadar) and adding road km would be
  // a double-charge. `starting_cities` now contains ISB on KDU/KHI-canonical
  // packages too (search visibility), so the old check
  // `startingCities.includes("ISB") && args.home === "LHE"` would over-apply.
  const lheFliesIn = args.home === "LHE" && ((flightQuote?.addons.filter((a) => a.isRequired).length ?? 0) > 0);
  const extensionKm = !lheFliesIn && startingCities.includes("ISB") && args.home === "LHE" ? LHE_EXTENSION_KM : 0;
  const totalDistanceKm = baseDistance + extensionKm;

  // Room count reported back to the UI: max rooms used on any night becomes the
  // floor the - button enforces. Per-night allocations can vary if a package
  // mixes hotels with different room types, so we take the worst case.
  const allocatedRooms = Math.max(
    1,
    ...((hotelQuote?.nights ?? []).map((n) => n.allocation?.rooms.length ?? 0)),
  );

  const luxuryDayTrip = pkg.duration === 1 && args.tier === "luxury";
  // Vehicle sized for all seated bodies (adults + all children). Infants are
  // on laps so they don't need a seat.
  const vehiclePlan = planVehicles(vehicles, paxBillable, ncpEligible, luxuryDayTrip);
  const unresolved: string[] = [];
  if (!vehiclePlan) unresolved.push("Could not allocate a vehicle for the requested party size.");

  const effectiveFuelPrice = pkg.fuel_price_per_litre ?? engineConfig.fuelPricePerLitre;
  const effectiveProfitPct = pkg.profit_percentage ?? engineConfig.profitPercentage;
  const fuelCost = vehiclePlan
    ? (totalDistanceKm / Math.max(1, vehiclePlan.kmPerLitre)) * effectiveFuelPrice * vehiclePlan.count
    : 0;
  const rentCost = vehiclePlan ? vehiclePlan.rentPerDay * pkg.duration * vehiclePlan.count : 0;
  const transportCost = fuelCost + rentCost;

  const hotelCost = hotelQuote?.totalCost ?? 0;
  if ((hotelQuote?.warnings.length ?? 0) > 0) {
    unresolved.push(...(hotelQuote!.warnings));
  }

  const flightRequired = !(flightQuote?.homeInStartingCities ?? true) && (flightQuote?.addons.length ?? 0) > 0;
  const adultFlightPerPerson = flightQuote?.addonCostPerPerson ?? 0;
  const childFlightPerPerson = flightQuote?.addonChildPerPerson ?? 0;
  const infantFlightPerPerson = flightQuote?.addonInfantPerPerson ?? 0;
  // Flight cost is billed per-bracket in the per-person totals below, not via
  // a party subtotal — kids (2-12) get the aviation "child" fare and infants
  // (0-2) get the "infant" fare, all separately from adults.
  const flightLegs = flightQuote?.addons.flatMap((a) => a.flightLegs ?? []) ?? [];
  const flightTicketType: "return" | "oneway" | null = flightRequired && flightLegs.length > 0
    ? (flightLegs.some((l) => l.routeType === "RETURN") || flightLegs.length >= 2 ? "return" : "oneway")
    : null;
  if (flightRequired && adultFlightPerPerson === 0) {
    unresolved.push("Flight cost could not be resolved for the requested dates.");
  }

  // Meals + entries billed to adults + older children (5-12) only. Under-5
  // travel free per policy (rule: "entry above 5 is adult price, same for
  // meal"; under 5 free).
  const mealsCost = (pkg.meals_per_person ?? 0) * paxCostBearing * pkg.duration;
  const entriesCost = (pkg.entries_per_person ?? 0) * paxCostBearing;
  const jeepCost = (pkg.jeep_legs ?? []).reduce((sum, leg) => {
    const cap = Math.max(1, leg.capacity);
    const jeeps = Math.max(1, Math.ceil(paxBillable / cap));
    return sum + jeeps * leg.costPerJeep;
  }, 0);

  // Party-wide subtotal + adult subtotal for per-adult display.
  // Adult per-person share of party-wide costs (transport + hotel + meals +
  // entries + jeeps) split across cost bearers (adults + kids 5-12); each
  // pays their own flight on top.
  const partyBase = transportCost + hotelCost + mealsCost + entriesCost + jeepCost;
  const perBearerShare = paxCostBearing > 0 ? partyBase / paxCostBearing : partyBase;
  const marginMul = 1 + effectiveProfitPct / 100;
  // Per-bracket raw totals (before rounding).
  const rawAdult = (perBearerShare + adultFlightPerPerson) * marginMul;
  const rawChild512 = (perBearerShare + childFlightPerPerson) * marginMul;
  const rawChild25 = childFlightPerPerson * marginMul;             // no hotel/transport/meals/entries
  const rawInfant = infantFlightPerPerson * marginMul;
  const perAdult = Math.round(rawAdult / 1000) * 1000;
  const perChild_5_12 = children_5_12 > 0 ? Math.round(rawChild512 / 1000) * 1000 : 0;
  const perChild_2_5 = children_2_5 > 0 ? Math.round(rawChild25 / 1000) * 1000 : 0;
  const perInfant = infants > 0 ? Math.round(rawInfant / 1000) * 1000 : 0;
  const total =
    perAdult * adults
    + perChild_5_12 * children_5_12
    + perChild_2_5 * children_2_5
    + perInfant * infants;

  return {
    slug: pkg.slug,
    duration: pkg.duration,
    nights: Math.max(1, pkg.duration - 1),
    tier: args.tier,
    pax: paxBillable,
    adults,
    children_5_12,
    children_2_5,
    infants,
    rooms: allocatedRooms,
    home: args.home,
    startDate: args.startDate,
    total,
    perPerson: perAdult,
    perAdult,
    perChild_5_12,
    perChild_2_5,
    perInfant,
    unresolved,
    vehicle: vehiclePlan
      ? { code: vehiclePlan.code, isNcp: vehiclePlan.isNcp, count: vehiclePlan.count }
      : null,
    flightPerPerson: flightRequired && adultFlightPerPerson > 0 ? adultFlightPerPerson : 0,
    flightTicketType,
  };
}

/**
 * Cached entrypoint. Flight scrape runs on a 12h cron so a 1-hour cache stays
 * well within the freshness window while killing redundant engine calls when
 * the same (slug, home, tier, pax, startDate) is requested repeatedly across
 * visitors or by the same visitor toggling tier back and forth. The cache is
 * tagged so admin tooling can `revalidateTag("package-quote")` after a price
 * change without waiting for TTL.
 */
export const quotePackage = unstable_cache(
  computeQuote,
  ["package-quote-v1"],
  { revalidate: 60 * 60, tags: ["package-quote"] },
);

// ── Bulk reprice (cron + admin "save engine input" actions share this) ────────

const HOMES_REPRICE: HomeCity[] = ["ISB", "LHE", "KHI"];
const TIERS_REPRICE: Tier[] = ["deluxe", "luxury"];
const CANONICAL_PAX = 2;

export function canonicalStartDate(): string {
  // 30 days out — within the flight-scrape coverage window, far enough that
  // peak-season pricing applies for the bulk of the Pakistani tour calendar.
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

export interface RepricePackageResult {
  slug: string;
  written: number;
  skipped: Array<{ tier: Tier; home: HomeCity; reason: string }>;
}

export interface RepriceSummary {
  startDate: string;
  processed: number;
  results: RepricePackageResult[];
  failures: Array<{ slug: string; error: string }>;
}

async function repriceOnePackage(slug: string, startDate: string): Promise<RepricePackageResult> {
  const supabase = getSupabaseAdmin();
  const { data: pkg, error } = await supabase
    .from("packages")
    .select("pricing")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`load ${slug}: ${error.message}`);
  if (!pkg) throw new Error(`Package ${slug} not found`);

  const current = (pkg.pricing as Record<string, Record<string, number | null>> | null) ?? {};
  const next: Record<string, Record<string, number | null>> = { ...current };
  const skipped: RepricePackageResult["skipped"] = [];
  let written = 0;

  // Quotes for one package fire in parallel (6 combos) — each combo hits
  // hotels + flights + vehicles independently, so concurrency is safe.
  const combos = TIERS_REPRICE.flatMap((tier) =>
    HOMES_REPRICE.map((home) => ({ tier, home })),
  );
  const quotes = await Promise.all(
    combos.map(({ tier, home }) =>
      computeQuote({ slug, home, tier, pax: CANONICAL_PAX, startDate }).then((q) => ({ tier, home, q })),
    ),
  );

  for (const tier of TIERS_REPRICE) {
    const tierBlock = { ...(next[tier] ?? {}) };
    for (const home of HOMES_REPRICE) {
      const entry = quotes.find((x) => x.tier === tier && x.home === home);
      const quote = entry?.q;
      if (!quote) {
        skipped.push({ tier, home, reason: "engine returned null" });
        continue;
      }
      if (quote.unresolved.length > 0) {
        skipped.push({ tier, home, reason: quote.unresolved.join("; ") });
        continue;
      }
      if (!Number.isFinite(quote.perPerson) || quote.perPerson <= 0) {
        skipped.push({ tier, home, reason: `non-positive perPerson (${quote.perPerson})` });
        continue;
      }
      tierBlock[home] = quote.perPerson;
      written += 1;
    }
    if (Object.keys(tierBlock).length > 0) next[tier] = tierBlock;
  }

  const { error: writeErr } = await supabase
    .from("packages")
    .update({ pricing: next })
    .eq("slug", slug);
  if (writeErr) throw new Error(`write ${slug}: ${writeErr.message}`);

  return { slug, written, skipped };
}

/**
 * Recompute the engine snapshot for every package. Called by:
 *   - GET/POST /api/cron/auto-reprice (Vercel daily cron)
 *   - Admin save actions that mutate engine inputs (vehicles, engine_config)
 *
 * Packages are processed with bounded concurrency (5 at a time) so we don't
 * burst-hit Supabase with all 56 in parallel while still finishing in well
 * under a minute. Returns a per-package summary the caller can show / log.
 */
/**
 * Reprice a single package (used by the calculator's per-package save flow).
 * Faster + scoped — per-package overrides (fuel/profit/distance/etc.) have no
 * cross-package effect, so a full-catalog reprice would be wasted work.
 */
export async function repricePackageBySlug(slug: string): Promise<RepricePackageResult> {
  return repriceOnePackage(slug, canonicalStartDate());
}

export async function repriceAllPackages(): Promise<RepriceSummary> {
  const supabase = getSupabaseAdmin();
  const { data: pkgs, error } = await supabase.from("packages").select("slug");
  if (error) throw new Error(`list packages: ${error.message}`);

  const startDate = canonicalStartDate();
  const slugs = ((pkgs ?? []) as Array<{ slug: string }>).map((p) => p.slug);
  const results: RepricePackageResult[] = [];
  const failures: Array<{ slug: string; error: string }> = [];

  const CONCURRENCY = 5;
  for (let i = 0; i < slugs.length; i += CONCURRENCY) {
    const batch = slugs.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((s) => repriceOnePackage(s, startDate)));
    for (let j = 0; j < settled.length; j++) {
      const r = settled[j];
      if (r.status === "fulfilled") results.push(r.value);
      else failures.push({ slug: batch[j], error: (r.reason as Error).message });
    }
  }

  return { startDate, processed: results.length, results, failures };
}
