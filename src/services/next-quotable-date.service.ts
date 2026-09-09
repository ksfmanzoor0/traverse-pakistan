import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { HomeCity } from "@/services/addon-cost.service";

interface FlightLegConfig {
  from: string;
  to: string;
  day: number | "last";
  routeType: "ONEWAY" | "RETURN";
  farePerPerson?: number;
}
interface AddonRow {
  type: string;
  is_required: boolean;
  applies_to_departures: string[];
  config: { legs?: FlightLegConfig[] } | null;
}

function substituteHome(v: string, home: HomeCity): string {
  return v === "{home}" ? home : v;
}

/**
 * Earliest upcoming date on which the package's first flight leg has a
 * scraped fare row. Used as the wizard/sidebar mount default so the
 * displayed total matches a date the customer could actually book —
 * instead of a blind `today + 30d` that might hit a stale off-peak fare
 * and mislead by ~10 percent versus the near-term real price.
 *
 * Falls back to `today + 30d` when the package has no flight legs, no
 * matching addon for the home city, or no scraped rows in the next 90d.
 */
export async function pickEarliestQuotableStartDate(
  slug: string,
  home: HomeCity,
): Promise<string> {
  const fallback = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("package_addons")
    .select("type, is_required, applies_to_departures, config")
    .eq("package_slug", slug)
    .eq("type", "flight");
  if (error || !data || data.length === 0) return fallback;

  const legs = (data as AddonRow[])
    .filter((a) => a.applies_to_departures.includes(home))
    .flatMap((a) => a.config?.legs ?? [])
    .filter((l) => typeof l.farePerPerson !== "number");
  if (legs.length === 0) return fallback;

  // Only need the first (outbound) leg for the anchor date. Inbound-return
  // fare quality on that same base date is a fair proxy.
  const first = legs.find((l) => l.day === 1) ?? legs[0];
  const from = substituteHome(first.from, home);
  const to = substituteHome(first.to, home);

  const today = new Date().toISOString().slice(0, 10);
  const cap = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const { data: fareRows, error: fareErr } = await supabase
    .from("flight_routes")
    .select("depart_date")
    .eq("origin", from)
    .eq("destination", to)
    .gte("depart_date", today)
    .lte("depart_date", cap)
    .order("depart_date", { ascending: true })
    .limit(1);
  if (fareErr || !fareRows || fareRows.length === 0) return fallback;

  return fareRows[0].depart_date as string;
}
