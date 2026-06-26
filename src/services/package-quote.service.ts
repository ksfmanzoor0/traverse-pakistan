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
  const baseDistance = pkg.total_distance_km ?? 0;
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
  const total = Math.round(subtotal * (1 + engineConfig.profitPercentage / 100));
  const perPerson = Math.round(total / pax / 1000) * 1000;

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
