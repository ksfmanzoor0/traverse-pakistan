import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { FlightAirline, FlightRouteType } from "@/types/flight";
import type { PackageAddonRow } from "@/lib/supabase/types";

export type HomeCity = "ISB" | "LHE" | "KHI";

export interface FlightLegConfig {
  from: string;             // "{home}" or fixed airport code
  to: string;
  routeType: FlightRouteType;
  day: number | "last";
}

export interface ResolvedFlightLeg {
  from: string;
  to: string;
  routeType: FlightRouteType;
  departDate: string;
  perPerson: number;
  source: "manual" | "averaged" | "single" | "unresolved";
  carriers: { airline: string; fare: number; scrapedAt: string }[];
  manualOverride?: { airline: string; fare: number; notes: string | null };
  unresolvedReason?: string;
}

export interface ResolvedAddon {
  addonId: string;
  type: "flight" | "bus";
  label: string;
  groupKey: string | null;
  isRequired: boolean;
  priority: number;
  perPerson: number;
  flightLegs?: ResolvedFlightLeg[];
}

export interface PackageQuote {
  packageSlug: string;
  homeCity: HomeCity;
  startDate: string;
  duration: number;
  startingCities: string[];
  homeInStartingCities: boolean;
  addonCostPerPerson: number;
  addons: ResolvedAddon[];
  unresolvedLegs: ResolvedFlightLeg[];
}

const ELIGIBLE_CARRIERS: Record<string, FlightAirline[]> = {
  "ISB-KDU": ["PIA", "AirBlue", "AirSial"],  "KDU-ISB": ["PIA", "AirBlue", "AirSial"],
  "LHE-KDU": ["PIA", "AirBlue"],              "KDU-LHE": ["PIA", "AirBlue"],
  "KHI-KDU": ["PIA"],                          "KDU-KHI": ["PIA"],
  "ISB-KHI": ["PIA", "AirBlue", "AirSial"],  "KHI-ISB": ["PIA", "AirBlue", "AirSial"],
  "LHE-KHI": ["PIA", "AirBlue", "AirSial"],  "KHI-LHE": ["PIA", "AirBlue", "AirSial"],
  "ISB-LHE": ["PIA", "AirBlue"],              "LHE-ISB": ["PIA", "AirBlue"],
};

/** Window (days) around the requested date to consider matching scraped fares.
 *  21 bridges the scraper's +30 / +60 day horizons. */
const FARE_DATE_WINDOW_DAYS = 21;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function substituteHome(token: string, home: HomeCity): string {
  return token === "{home}" ? home : token;
}

function legDate(leg: FlightLegConfig, startDate: string, duration: number): string {
  if (leg.day === "last") return addDays(startDate, Math.max(0, duration - 1));
  return addDays(startDate, Math.max(0, leg.day - 1));
}

interface FareCandidate {
  airline: string;
  fare: number;
  source: string;
  scrapedAt: string;
  departDate: string;
  notes: string | null;
}

async function fetchLegCandidates(
  origin: string,
  destination: string,
  routeType: FlightRouteType,
  targetDate: string,
): Promise<FareCandidate[]> {
  const supabase = getSupabaseAdmin();
  const lo = addDays(targetDate, -FARE_DATE_WINDOW_DAYS);
  const hi = addDays(targetDate, FARE_DATE_WINDOW_DAYS);
  const { data, error } = await supabase
    .from("flight_routes")
    .select("airline, fare_total, source, scraped_at, depart_date, notes")
    .eq("origin", origin)
    .eq("destination", destination)
    .eq("route_type", routeType)
    .gte("depart_date", lo)
    .lte("depart_date", hi);
  if (error) throw new Error(`fetchLegCandidates: ${error.message}`);
  return ((data ?? []) as Array<{
    airline: string;
    fare_total: number;
    source: string;
    scraped_at: string;
    depart_date: string;
    notes: string | null;
  }>).map((r) => ({
    airline: r.airline,
    fare: r.fare_total,
    source: r.source,
    scrapedAt: r.scraped_at,
    departDate: r.depart_date,
    notes: r.notes,
  }));
}

function resolveSingleLeg(
  candidates: FareCandidate[],
  pair: string,
  targetDate: string,
): Pick<ResolvedFlightLeg, "perPerson" | "source" | "carriers" | "manualOverride" | "unresolvedReason"> {
  const eligible = ELIGIBLE_CARRIERS[pair];
  if (!eligible) {
    return { perPerson: 0, source: "unresolved", carriers: [], unresolvedReason: `No carrier rules for ${pair}` };
  }

  const manual = candidates.find((c) => c.source === "manual");
  if (manual) {
    return {
      perPerson: manual.fare,
      source: "manual",
      carriers: [{ airline: manual.airline, fare: manual.fare, scrapedAt: manual.scrapedAt }],
      manualOverride: { airline: manual.airline, fare: manual.fare, notes: manual.notes },
    };
  }

  const byCarrier = new Map<string, FareCandidate>();
  for (const c of candidates) {
    if (!eligible.includes(c.airline as FlightAirline)) continue;
    const prior = byCarrier.get(c.airline);
    if (!prior) { byCarrier.set(c.airline, c); continue; }
    const priorOnTarget = prior.departDate === targetDate;
    const candOnTarget = c.departDate === targetDate;
    if (candOnTarget && !priorOnTarget) byCarrier.set(c.airline, c);
    else if (candOnTarget === priorOnTarget && c.fare < prior.fare) byCarrier.set(c.airline, c);
  }

  const picked = Array.from(byCarrier.values());
  if (picked.length === 0) {
    return { perPerson: 0, source: "unresolved", carriers: [],
      unresolvedReason: `No fares within ±${FARE_DATE_WINDOW_DAYS} days for ${pair} on ${targetDate}` };
  }

  const avg = Math.round(picked.reduce((s, c) => s + c.fare, 0) / picked.length);
  return {
    perPerson: avg,
    source: picked.length === 1 ? "single" : "averaged",
    carriers: picked.map((c) => ({ airline: c.airline, fare: c.fare, scrapedAt: c.scrapedAt })),
  };
}

async function resolveFlightAddon(
  addon: PackageAddonRow,
  home: HomeCity,
  startDate: string,
  duration: number,
): Promise<{ perPerson: number; legs: ResolvedFlightLeg[] }> {
  const legs = (addon.config.legs ?? []) as FlightLegConfig[];
  const resolved: ResolvedFlightLeg[] = [];

  for (const leg of legs) {
    const from = substituteHome(leg.from, home);
    const to = substituteHome(leg.to, home);
    const targetDate = legDate(leg, startDate, duration);
    const pair = `${from}-${to}`;
    const candidates = await fetchLegCandidates(from, to, leg.routeType, targetDate);
    const r = resolveSingleLeg(candidates, pair, targetDate);
    resolved.push({ from, to, routeType: leg.routeType, departDate: targetDate, ...r });
  }

  return { perPerson: resolved.reduce((s, l) => s + l.perPerson, 0), legs: resolved };
}

export interface QuoteArgs {
  packageSlug: string;
  homeCity: HomeCity;
  startDate: string;
}

export async function quotePackageAddons(args: QuoteArgs): Promise<PackageQuote | null> {
  const supabase = getSupabaseAdmin();
  const { data: pkgRow, error: pkgErr } = await supabase
    .from("packages")
    .select("slug, duration, starting_cities")
    .eq("slug", args.packageSlug)
    .maybeSingle();
  if (pkgErr) throw new Error(`quotePackageAddons: ${pkgErr.message}`);
  if (!pkgRow) return null;

  const pkg = pkgRow as { slug: string; duration: number; starting_cities: string[] };
  const startingCities = pkg.starting_cities ?? [];

  // Trust the addons table as the source of truth for "does this traveler
  // need extra transport." We used to bail early when `starting_cities`
  // contained the home — but that was wrong once we expanded a KDU package's
  // `starting_cities` to include ISB/LHE/KHI for search visibility. The
  // canonical "no flight needed" set lives in `package_addons.applies_to_
  // departures` (e.g. KDU package addon applies to ISB/LHE/KHI but NOT KDU).
  // `homeInStartingCities` is now derived after addon resolution: true iff
  // no required addons fire for this home.
  const { data: addonRows, error: addonErr } = await supabase
    .from("package_addons")
    .select("*")
    .eq("package_slug", args.packageSlug)
    .order("priority", { ascending: true });
  if (addonErr) throw new Error(`quotePackageAddons: ${addonErr.message}`);

  const matching = ((addonRows ?? []) as unknown as PackageAddonRow[]).filter((a) =>
    a.applies_to_departures.includes(args.homeCity),
  );

  const resolved: ResolvedAddon[] = [];
  const unresolved: ResolvedFlightLeg[] = [];

  for (const addon of matching) {
    if (addon.type === "flight") {
      const { perPerson, legs } = await resolveFlightAddon(addon, args.homeCity, args.startDate, pkg.duration);
      resolved.push({
        addonId: addon.id,
        type: "flight",
        label: addon.label,
        groupKey: addon.group_key,
        isRequired: addon.is_required,
        priority: addon.priority,
        perPerson,
        flightLegs: legs,
      });
      for (const l of legs) if (l.source === "unresolved") unresolved.push(l);
    }
    // type === 'bus' handled later when bus add-ons land
  }

  // For each group_key, the engine picks the cheapest required add-on (or
  // first if all optional). Today every group has 1 add-on, so no contest.
  const totalPerPerson = resolved.filter((a) => a.isRequired).reduce((s, a) => s + a.perPerson, 0);
  // "Local departure" semantics: no required addons fire — traveler doesn't
  // need any extra transport to reach the package's start point.
  const noJoinTransport = resolved.filter((a) => a.isRequired).length === 0;

  return {
    packageSlug: args.packageSlug,
    homeCity: args.homeCity,
    startDate: args.startDate,
    duration: pkg.duration,
    startingCities,
    homeInStartingCities: noJoinTransport,
    addonCostPerPerson: totalPerPerson,
    addons: resolved,
    unresolvedLegs: unresolved,
  };
}

export interface PackageWithAddons {
  slug: string;
  name: string;
  duration: number;
  destinationSlug: string;
  startingCities: string[];
}

export async function listPackagesWithAddons(): Promise<PackageWithAddons[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("packages")
    .select("slug, name, duration, destination_slug, starting_cities, package_addons!inner(id)")
    .order("slug");
  if (error) throw new Error(`listPackagesWithAddons: ${error.message}`);
  const seen = new Set<string>();
  const out: PackageWithAddons[] = [];
  for (const r of (data ?? []) as Array<{
    slug: string;
    name: string;
    duration: number;
    destination_slug: string;
    starting_cities: string[];
  }>) {
    if (seen.has(r.slug)) continue;
    seen.add(r.slug);
    out.push({
      slug: r.slug,
      name: r.name,
      duration: r.duration,
      destinationSlug: r.destination_slug,
      startingCities: r.starting_cities ?? [],
    });
  }
  return out;
}
