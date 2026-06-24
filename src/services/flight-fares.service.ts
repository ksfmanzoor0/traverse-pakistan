import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { FlightRouteRow } from "@/types/flight";

interface ListFilters {
  origin?: string;
  destination?: string;
  routeType?: "ONEWAY" | "RETURN";
  airline?: string;
  source?: "aeroglobe" | "manual";
  departFrom?: string;    // YYYY-MM-DD
  departTo?: string;      // YYYY-MM-DD
  limit?: number;
}

interface FlightRouteDbRow {
  id: string;
  origin: string;
  destination: string;
  airline: string;
  flight_numbers: string[] | null;
  route_type: "ONEWAY" | "RETURN";
  depart_date: string;
  return_date: string | null;
  fare_total: number;
  base_fare: number | null;
  tax: number | null;
  rbd: string | null;
  is_refundable: boolean | null;
  currency: string;
  source: string;
  source_url: string | null;
  notes: string | null;
  scraped_at: string;
}

function rowFromDb(r: FlightRouteDbRow): FlightRouteRow {
  return {
    id: r.id,
    origin: r.origin,
    destination: r.destination,
    airline: r.airline,
    flightNumbers: r.flight_numbers ?? null,
    routeType: r.route_type,
    departDate: r.depart_date,
    returnDate: r.return_date,
    fareTotal: r.fare_total,
    baseFare: r.base_fare,
    tax: r.tax,
    rbd: r.rbd,
    isRefundable: r.is_refundable,
    currency: r.currency,
    source: r.source,
    sourceUrl: r.source_url,
    notes: r.notes,
    scrapedAt: r.scraped_at,
  };
}

export async function listFlightFares(filters: ListFilters = {}): Promise<FlightRouteRow[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("flight_routes")
    .select("*")
    .order("depart_date", { ascending: true })
    .order("scraped_at", { ascending: false })
    .limit(filters.limit ?? 500);

  if (filters.origin) query = query.eq("origin", filters.origin);
  if (filters.destination) query = query.eq("destination", filters.destination);
  if (filters.routeType) query = query.eq("route_type", filters.routeType);
  if (filters.airline) query = query.eq("airline", filters.airline);
  if (filters.source) query = query.eq("source", filters.source);
  if (filters.departFrom) query = query.gte("depart_date", filters.departFrom);
  if (filters.departTo) query = query.lte("depart_date", filters.departTo);

  const { data, error } = await query;
  if (error) throw new Error(`listFlightFares: ${error.message}`);
  return ((data ?? []) as unknown as FlightRouteDbRow[]).map(rowFromDb);
}

export interface ManualOverridePayload {
  origin: string;
  destination: string;
  airline: string;
  routeType: "ONEWAY" | "RETURN";
  departDate: string;       // YYYY-MM-DD
  returnDate: string | null;
  fareTotal: number;
  notes: string | null;
}

export async function upsertManualOverride(payload: ManualOverridePayload, updatedBy: string | null): Promise<FlightRouteRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("flight_routes")
    .upsert(
      {
        origin: payload.origin,
        destination: payload.destination,
        airline: payload.airline,
        route_type: payload.routeType,
        depart_date: payload.departDate,
        return_date: payload.returnDate,
        fare_total: payload.fareTotal,
        currency: "PKR",
        source: "manual",
        source_url: updatedBy ? `manual:${updatedBy}` : "manual",
        notes: payload.notes,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: "origin,destination,airline,route_type,depart_date,return_date,source" },
    )
    .select()
    .single();
  if (error) throw new Error(`upsertManualOverride: ${error.message}`);
  return rowFromDb(data as unknown as FlightRouteDbRow);
}

export async function deleteManualOverride(id: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("flight_routes")
    .delete()
    .eq("id", id)
    .eq("source", "manual");
  if (error) throw new Error(`deleteManualOverride: ${error.message}`);
}

export interface ScrapeStatus {
  lastScrapedAt: string | null;
  scrapedRows: number;
  manualRows: number;
}

export interface ScraperConfig {
  email: string;
  hasPassword: boolean;          // never return the password itself to the client
  scrapeEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function getScraperConfig(): Promise<ScraperConfig> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("flight_scraper_config")
    .select("aeroglobe_email, aeroglobe_password, scrape_enabled, updated_at, updated_by")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw new Error(`getScraperConfig: ${error.message}`);
  const row = (data ?? {}) as {
    aeroglobe_email?: string | null;
    aeroglobe_password?: string | null;
    scrape_enabled?: boolean | null;
    updated_at?: string | null;
    updated_by?: string | null;
  };
  return {
    email: row.aeroglobe_email ?? "",
    hasPassword: typeof row.aeroglobe_password === "string" && row.aeroglobe_password.length > 0,
    scrapeEnabled: row.scrape_enabled ?? true,
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
  };
}

export interface ScraperConfigUpdate {
  email?: string;
  password?: string;              // optional — only updated when provided
  scrapeEnabled?: boolean;
}

export async function updateScraperConfig(update: ScraperConfigUpdate, updatedBy: string | null): Promise<ScraperConfig> {
  const supabase = getSupabaseAdmin();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
    updated_by: updatedBy,
  };
  if (typeof update.email === "string") patch.aeroglobe_email = update.email.trim() || null;
  if (typeof update.password === "string" && update.password.length > 0) {
    patch.aeroglobe_password = update.password;
  }
  if (typeof update.scrapeEnabled === "boolean") patch.scrape_enabled = update.scrapeEnabled;

  const { error } = await supabase
    .from("flight_scraper_config")
    .upsert({ id: "default", ...patch }, { onConflict: "id" });
  if (error) throw new Error(`updateScraperConfig: ${error.message}`);
  return getScraperConfig();
}

export async function getScrapeStatus(): Promise<ScrapeStatus> {
  const supabase = getSupabaseAdmin();
  const { data: latest } = await supabase
    .from("flight_routes")
    .select("scraped_at")
    .eq("source", "aeroglobe")
    .order("scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { count: scrapedCount } = await supabase
    .from("flight_routes")
    .select("id", { count: "exact", head: true })
    .eq("source", "aeroglobe");

  const { count: manualCount } = await supabase
    .from("flight_routes")
    .select("id", { count: "exact", head: true })
    .eq("source", "manual");

  const lastScrapedAt =
    latest && typeof (latest as { scraped_at?: unknown }).scraped_at === "string"
      ? ((latest as { scraped_at: string }).scraped_at)
      : null;

  return {
    lastScrapedAt,
    scrapedRows: scrapedCount ?? 0,
    manualRows: manualCount ?? 0,
  };
}
