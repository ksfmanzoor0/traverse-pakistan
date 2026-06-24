import { requireAdmin } from "@/lib/admin/guard";
import { listFlightFares, getScrapeStatus } from "@/services/flight-fares.service";
import type { FlightRouteRow } from "@/types/flight";
import { FlightFaresFilters } from "@/components/admin/flight-fares/FlightFaresFilters";
import { FlightFaresTable } from "@/components/admin/flight-fares/FlightFaresTable";
import { ManualFareForm } from "@/components/admin/flight-fares/ManualFareForm";

export const dynamic = "force-dynamic";

const ROUTE_TYPES = ["ONEWAY", "RETURN"] as const;

type SearchParams = {
  origin?: string;
  destination?: string;
  routeType?: string;
  airline?: string;
  source?: string;
  from?: string;
  to?: string;
};

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default async function FlightFaresPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const params = await searchParams;

  const routeType = ROUTE_TYPES.includes(params.routeType as "ONEWAY" | "RETURN")
    ? (params.routeType as "ONEWAY" | "RETURN")
    : undefined;
  const source =
    params.source === "manual" || params.source === "aeroglobe" ? (params.source as "manual" | "aeroglobe") : undefined;

  const [fares, status] = await Promise.all([
    listFlightFares({
      origin: params.origin?.toUpperCase() || undefined,
      destination: params.destination?.toUpperCase() || undefined,
      routeType,
      airline: params.airline || undefined,
      source,
      departFrom: params.from || undefined,
      departTo: params.to || undefined,
      limit: 500,
    }),
    getScrapeStatus(),
  ]);

  const latestPerKey = pickLatestPerKey(fares);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            Flight Fares
          </h1>
          <p
            className="text-sm mt-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Aeroglobe-scraped fares plus admin overrides. Manual rows take precedence in the quote engine.
          </p>
        </div>
        <div
          className="rounded-lg px-4 py-3 text-sm grid grid-cols-3 gap-x-6 gap-y-1"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-default)",
          }}
        >
          <div style={{ color: "var(--text-tertiary)" }}>Last scrape</div>
          <div style={{ color: "var(--text-tertiary)" }}>Scraped rows</div>
          <div style={{ color: "var(--text-tertiary)" }}>Manual rows</div>
          <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {formatRelative(status.lastScrapedAt)}
          </div>
          <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {status.scrapedRows.toLocaleString()}
          </div>
          <div style={{ color: "var(--text-primary)", fontWeight: 600 }}>
            {status.manualRows.toLocaleString()}
          </div>
        </div>
      </div>

      <FlightFaresFilters initial={params} />

      <ManualFareForm />

      <FlightFaresTable rows={latestPerKey} totalShown={latestPerKey.length} totalLoaded={fares.length} />
    </div>
  );
}

/**
 * Collapse to one row per (origin, destination, airline, route_type, depart_date, return_date)
 * picking `source='manual'` first (override), otherwise the freshest scraped row.
 */
function pickLatestPerKey(rows: FlightRouteRow[]): FlightRouteRow[] {
  const byKey = new Map<string, FlightRouteRow>();
  for (const r of rows) {
    const key = `${r.origin}|${r.destination}|${r.airline}|${r.routeType}|${r.departDate}|${r.returnDate ?? ""}`;
    const prior = byKey.get(key);
    if (!prior) {
      byKey.set(key, r);
      continue;
    }
    // Prefer manual over scraped; among same source, freshest scraped_at wins.
    if (r.source === "manual" && prior.source !== "manual") byKey.set(key, r);
    else if (r.source === prior.source && r.scrapedAt > prior.scrapedAt) byKey.set(key, r);
  }
  return Array.from(byKey.values()).sort((a, b) => {
    if (a.departDate !== b.departDate) return a.departDate.localeCompare(b.departDate);
    return `${a.origin}-${a.destination}`.localeCompare(`${b.origin}-${b.destination}`);
  });
}
