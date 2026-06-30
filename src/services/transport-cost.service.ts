import { getSupabaseAdmin } from "@/lib/supabase/server";

/** Constants the engine treats as global. */
export const PER_LEG_BUFFER_KM = 50;
export const LHE_EXTENSION_KM = 800;       // ISB-canonical → LHE round-trip add-on

export interface DistanceBreakdownLeg {
  from: string;
  to: string;
  baseKm: number;
  bufferKm: number;
  totalKm: number;
}

export interface PackageDistance {
  packageSlug: string;
  startingCity: string;       // e.g. "ISB" | "LHE" | "KDU"
  majorStops: string[];
  legs: DistanceBreakdownLeg[];
  missingLegs: { from: string; to: string }[];
  baseKm: number;             // sum of matrix lookups
  bufferKm: number;            // 50 per leg
  extensionKm: number;         // LHE 800 etc.
  totalKm: number;
}

/** Bulk-fetch matrix entries for the requested pairs. */
async function fetchDistances(pairs: Array<[string, string]>): Promise<Map<string, number>> {
  if (pairs.length === 0) return new Map();
  const supabase = getSupabaseAdmin();
  // Build OR filter — Supabase doesn't have native tuple-IN.
  const orParts = pairs.map(
    ([a, b]) => `and(from_code.eq.${esc(a)},to_code.eq.${esc(b)})`,
  );
  const { data, error } = await supabase
    .from("location_distances")
    .select("from_code, to_code, km")
    .or(orParts.join(","));
  if (error) throw new Error(`fetchDistances: ${error.message}`);
  const map = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ from_code: string; to_code: string; km: number }>) {
    map.set(`${r.from_code}→${r.to_code}`, r.km);
  }
  return map;
}

function esc(v: string): string {
  // Comma and parentheses break Supabase's PostgREST or-filter syntax; quote them.
  if (/[(),]/.test(v)) return `"${v}"`;
  return v;
}

/**
 * Compute total vehicle distance for one selected starting city.
 * - Uses package.major_stops as the waypoint chain.
 * - Adds PER_LEG_BUFFER_KM per leg.
 * - For ISB-canonical packages selected as LHE, adds LHE_EXTENSION_KM once.
 */
export async function computePackageDistance(args: {
  packageSlug: string;
  selectedCity: string;        // home/start city the customer picks
}): Promise<PackageDistance | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("packages")
    .select("slug, major_stops, starting_cities")
    .eq("slug", args.packageSlug)
    .maybeSingle();
  if (error) throw new Error(`computePackageDistance: ${error.message}`);
  if (!data) return null;

  const pkg = data as { slug: string; major_stops: string[]; starting_cities: string[] };
  const stops = pkg.major_stops ?? [];
  if (stops.length < 2) {
    return {
      packageSlug: pkg.slug,
      startingCity: args.selectedCity,
      majorStops: stops,
      legs: [],
      missingLegs: [],
      baseKm: 0,
      bufferKm: 0,
      extensionKm: 0,
      totalKm: 0,
    };
  }

  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < stops.length - 1; i += 1) pairs.push([stops[i], stops[i + 1]]);
  const distMap = await fetchDistances(pairs);

  const legs: DistanceBreakdownLeg[] = [];
  const missingLegs: { from: string; to: string }[] = [];
  let baseKm = 0;
  let bufferKm = 0;

  for (const [from, to] of pairs) {
    const km = distMap.get(`${from}→${to}`);
    if (km == null) {
      missingLegs.push({ from, to });
      continue;
    }
    legs.push({ from, to, baseKm: km, bufferKm: PER_LEG_BUFFER_KM, totalKm: km + PER_LEG_BUFFER_KM });
    baseKm += km;
    bufferKm += PER_LEG_BUFFER_KM;
  }

  // LHE extension: ISB-canonical packages where customer picks LHE.
  const isIsbCanonical = (pkg.starting_cities ?? []).includes("ISB");
  const extensionKm = isIsbCanonical && args.selectedCity === "LHE" ? LHE_EXTENSION_KM : 0;

  return {
    packageSlug: pkg.slug,
    startingCity: args.selectedCity,
    majorStops: stops,
    legs,
    missingLegs,
    baseKm,
    bufferKm,
    extensionKm,
    totalKm: baseKm + bufferKm + extensionKm,
  };
}
