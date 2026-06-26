import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { quotePackageAddons, type HomeCity } from "@/services/addon-cost.service";
import { quotePackageHotels } from "@/services/hotel-allocation.service";
import { listVehicleTypes, getEngineConfig } from "@/services/vehicle.service";

export type Tier = "deluxe" | "luxury" | "premium";

export interface PublicPackageQuote {
  slug: string;
  duration: number;
  nights: number;
  tier: Tier;
  pax: number;
  home: HomeCity;
  startDate: string;
  total: number;        // grand total for the whole party, post-margin
  perPerson: number;    // total / pax, rounded to nearest PKR 1,000
  unresolved: string[]; // soft warnings — e.g. missing flight fares, room shortfall
}

interface VehicleAllocation {
  /** Number of Prados (NCP-eligible packages) or default-tier vehicles needed. */
  count: number;
  kmPerLitre: number;
  rentPerDay: number;
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
): VehicleAllocation | null {
  if (ncpEligible) {
    const ncp = vehicles.find((v) => v.isNcp && v.ncpPairCode === "prado");
    if (!ncp) return null;
    return {
      count: Math.max(1, Math.ceil(pax / Math.max(1, ncp.maxPeople))),
      kmPerLitre: ncp.kmPerLitre,
      rentPerDay: ncp.rentPerDay,
    };
  }
  const order = ["corolla", "brv", "hiace", "coaster"];
  for (const code of order) {
    const v = vehicles.find((x) => x.code === code);
    if (v && v.maxPeople >= pax) {
      return { count: 1, kmPerLitre: v.kmPerLitre, rentPerDay: v.rentPerDay };
    }
  }
  const coaster = vehicles.find((v) => v.code === "coaster");
  if (!coaster) return null;
  return {
    count: Math.max(1, Math.ceil(pax / Math.max(1, coaster.maxPeople))),
    kmPerLitre: coaster.kmPerLitre,
    rentPerDay: coaster.rentPerDay,
  };
}

const LHE_EXTENSION_KM = 800;

/** Inner compute — call sites use the cached `quotePackage` wrapper. */
async function computeQuote(args: {
  slug: string;
  home: HomeCity;
  tier: Tier;
  pax: number;
  startDate: string;
}): Promise<PublicPackageQuote | null> {
  const supabase = getSupabaseAdmin();
  const { data: pkgRow, error } = await supabase
    .from("packages")
    .select("slug, duration, starting_cities, total_distance_km")
    .eq("slug", args.slug)
    .maybeSingle();
  if (error) throw new Error(`quotePackage: ${error.message}`);
  if (!pkgRow) return null;

  const pkg = pkgRow as {
    slug: string;
    duration: number;
    starting_cities: string[] | null;
    total_distance_km: number | null;
  };

  const startingCities = pkg.starting_cities ?? [];
  const ncpEligible = startingCities.includes("KDU") || startingCities.includes("GIL");
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
      pax: Math.max(1, Math.floor(args.pax)),
      home: args.home,
      startDate: args.startDate,
      total: 0,
      perPerson: 0,
      unresolved: [`Package ${pkg.slug} has no positive total_distance_km — engine cannot compute transport cost.`],
    };
  }
  const baseDistance = pkg.total_distance_km;
  const extensionKm = startingCities.includes("ISB") && args.home === "LHE" ? LHE_EXTENSION_KM : 0;
  const totalDistanceKm = baseDistance + extensionKm;
  const pax = Math.max(1, Math.floor(args.pax));

  const [flightQuote, hotelQuote, vehicles, engineConfig] = await Promise.all([
    quotePackageAddons({ packageSlug: args.slug, homeCity: args.home, startDate: args.startDate }),
    quotePackageHotels({ packageSlug: args.slug, tier: args.tier, people: pax, startDate: args.startDate }),
    listVehicleTypes(),
    getEngineConfig(),
  ]);

  const vehiclePlan = planVehicles(vehicles, pax, ncpEligible);
  const unresolved: string[] = [];
  if (!vehiclePlan) unresolved.push("Could not allocate a vehicle for the requested party size.");

  const fuelCost = vehiclePlan
    ? (totalDistanceKm / Math.max(1, vehiclePlan.kmPerLitre)) * engineConfig.fuelPricePerLitre * vehiclePlan.count
    : 0;
  const rentCost = vehiclePlan ? vehiclePlan.rentPerDay * pkg.duration * vehiclePlan.count : 0;
  const transportCost = fuelCost + rentCost;

  const hotelCost = hotelQuote?.totalCost ?? 0;
  if ((hotelQuote?.warnings.length ?? 0) > 0) {
    unresolved.push(...(hotelQuote!.warnings));
  }

  const flightRequired = !(flightQuote?.homeInStartingCities ?? true) && (flightQuote?.addons.length ?? 0) > 0;
  const flightPerPerson = flightQuote?.addonCostPerPerson ?? 0;
  const flightCost = flightRequired ? flightPerPerson * pax : 0;
  if (flightRequired && flightPerPerson === 0) {
    unresolved.push("Flight cost could not be resolved for the requested dates.");
  }

  const subtotal = transportCost + hotelCost + flightCost;
  const rawTotal = subtotal * (1 + engineConfig.profitPercentage / 100);
  // Round per-person to nearest 1k, then derive the total from it so the
  // displayed total = perPerson × pax exactly (no odd 396,666-style endings).
  const perPerson = Math.round(rawTotal / pax / 1000) * 1000;
  const total = perPerson * pax;

  return {
    slug: pkg.slug,
    duration: pkg.duration,
    nights: Math.max(1, pkg.duration - 1),
    tier: args.tier,
    pax,
    home: args.home,
    startDate: args.startDate,
    total,
    perPerson,
    unresolved,
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
const HOME_TO_PRICING_KEY: Record<HomeCity, "islamabad" | "lahore" | "karachi"> = {
  ISB: "islamabad",
  LHE: "lahore",
  KHI: "karachi",
};
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
      tierBlock[HOME_TO_PRICING_KEY[home]] = quote.perPerson;
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
