import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { FlightAirline, FlightRouteType } from "@/types/flight";

export type DepartureCity = "ISB" | "LHE" | "KHI";

export interface FlightLeg {
  from: string;             // "{departure}" or fixed airport code
  to: string;
  routeType: FlightRouteType;
}

export interface ResolvedLeg {
  from: string;
  to: string;
  routeType: FlightRouteType;
  departDate: string;
  perPerson: number;
  source: "manual" | "averaged" | "single" | "unresolved";
  carriers: { airline: string; fare: number; scrapedAt: string }[];
  manualOverride?: { airline: string; fare: number; notes: string | null };
  /** Reason the leg is unresolved — only set when source = "unresolved". */
  unresolvedReason?: string;
}

export interface FlightCostResult {
  packageSlug: string;
  departureCity: DepartureCity;
  departureDate: string;
  perPerson: number;
  legs: ResolvedLeg[];
  unresolvedLegs: ResolvedLeg[];
}

/**
 * Carriers eligible per airport pair. The resolver averages cheapest fares
 * across whichever of these carriers have data for the date.
 */
const ELIGIBLE_CARRIERS: Record<string, FlightAirline[]> = {
  "ISB-KDU": ["PIA", "AirBlue", "AirSial"],
  "KDU-ISB": ["PIA", "AirBlue", "AirSial"],
  "LHE-KDU": ["PIA", "AirBlue"],
  "KDU-LHE": ["PIA", "AirBlue"],
  "KHI-KDU": ["PIA"],
  "KDU-KHI": ["PIA"],
};

/** Date window (in days) around the requested departure to consider matching fares.
 *  Set to 21 to bridge the gap between the scraper's +30 and +60 day horizons —
 *  any trip date up to halfway between the two will find a fare on either side. */
const FARE_DATE_WINDOW_DAYS = 21;

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function substituteDeparture(token: string, departure: DepartureCity): string {
  return token === "{departure}" ? departure : token;
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
): Pick<ResolvedLeg, "perPerson" | "source" | "carriers" | "manualOverride" | "unresolvedReason"> {
  const eligible = ELIGIBLE_CARRIERS[pair];
  if (!eligible) {
    return {
      perPerson: 0,
      source: "unresolved",
      carriers: [],
      unresolvedReason: `No carrier rules configured for pair ${pair}`,
    };
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

  // For each eligible carrier, pick cheapest fare across the date window
  // (closest-date tie-breaker: prefer fare on the exact target date).
  const byCarrier = new Map<string, FareCandidate>();
  for (const c of candidates) {
    if (!eligible.includes(c.airline as FlightAirline)) continue;
    const prior = byCarrier.get(c.airline);
    if (!prior) {
      byCarrier.set(c.airline, c);
      continue;
    }
    const priorOnTarget = prior.departDate === targetDate;
    const candOnTarget = c.departDate === targetDate;
    if (candOnTarget && !priorOnTarget) byCarrier.set(c.airline, c);
    else if (candOnTarget === priorOnTarget && c.fare < prior.fare) byCarrier.set(c.airline, c);
  }

  const picked = Array.from(byCarrier.values());
  if (picked.length === 0) {
    return {
      perPerson: 0,
      source: "unresolved",
      carriers: [],
      unresolvedReason: `No scraped fares within ±${FARE_DATE_WINDOW_DAYS} days for ${pair} on ${targetDate}`,
    };
  }

  const total = picked.reduce((s, c) => s + c.fare, 0);
  const avg = Math.round(total / picked.length);
  return {
    perPerson: avg,
    source: picked.length === 1 ? "single" : "averaged",
    carriers: picked.map((c) => ({ airline: c.airline, fare: c.fare, scrapedAt: c.scrapedAt })),
  };
}

export interface ResolveFlightCostArgs {
  packageSlug: string;
  departureCity: DepartureCity;
  departureDate: string;     // YYYY-MM-DD — first day of the trip
}

export async function resolveFlightCostForPackage(
  args: ResolveFlightCostArgs,
): Promise<FlightCostResult | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("packages")
    .select("slug, duration, flight_legs")
    .eq("slug", args.packageSlug)
    .maybeSingle();
  if (error) throw new Error(`resolveFlightCostForPackage: ${error.message}`);
  if (!data) return null;

  const pkg = data as { slug: string; duration: number; flight_legs: FlightLeg[] | null };
  const legs = Array.isArray(pkg.flight_legs) ? pkg.flight_legs : [];
  const returnDay = addDays(args.departureDate, Math.max(0, pkg.duration - 1));

  const resolved: ResolvedLeg[] = [];
  for (let i = 0; i < legs.length; i += 1) {
    const leg = legs[i];
    const from = substituteDeparture(leg.from, args.departureCity);
    const to = substituteDeparture(leg.to, args.departureCity);
    // Outbound leg (KDU as destination) → trip start.
    // Inbound leg (KDU as origin) → trip end.
    const targetDate = to === "KDU" ? args.departureDate : returnDay;
    const pair = `${from}-${to}`;

    const candidates = await fetchLegCandidates(from, to, leg.routeType, targetDate);
    const r = resolveSingleLeg(candidates, pair, targetDate);
    resolved.push({
      from,
      to,
      routeType: leg.routeType,
      departDate: targetDate,
      ...r,
    });
  }

  const perPerson = resolved.reduce((s, l) => s + l.perPerson, 0);
  const unresolvedLegs = resolved.filter((l) => l.source === "unresolved");

  return {
    packageSlug: args.packageSlug,
    departureCity: args.departureCity,
    departureDate: args.departureDate,
    perPerson,
    legs: resolved,
    unresolvedLegs,
  };
}

/**
 * List all packages that declare flight legs. Used by the admin preview panel.
 */
export interface FlightInclusivePackage {
  slug: string;
  name: string;
  duration: number;
  destinationSlug: string;
  flightLegs: FlightLeg[];
}

export async function listFlightInclusivePackages(): Promise<FlightInclusivePackage[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("packages")
    .select("slug, name, duration, destination_slug, flight_legs")
    .order("slug");
  if (error) throw new Error(`listFlightInclusivePackages: ${error.message}`);
  return ((data ?? []) as Array<{
    slug: string;
    name: string;
    duration: number;
    destination_slug: string;
    flight_legs: FlightLeg[] | null;
  }>)
    .filter((r) => Array.isArray(r.flight_legs) && r.flight_legs.length > 0)
    .map((r) => ({
      slug: r.slug,
      name: r.name,
      duration: r.duration,
      destinationSlug: r.destination_slug,
      flightLegs: r.flight_legs!,
    }));
}
