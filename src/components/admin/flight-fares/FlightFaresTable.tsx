"use client";

import { useState } from "react";
import type { FlightRouteRow } from "@/types/flight";
import { removeManualOverride } from "@/app/admin/flight-fares/actions";

function fmtPkr(n: number): string {
  return new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(n);
}

function fmtDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function fmtScraped(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}

export function FlightFaresTable({
  rows,
  totalShown,
  totalLoaded,
}: {
  rows: FlightRouteRow[];
  totalShown: number;
  totalLoaded: number;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!confirm("Remove this manual override? The scraped value (if any) will take over.")) return;
    setDeletingId(id);
    const fd = new FormData();
    fd.set("id", id);
    const result = await removeManualOverride(fd);
    if (!result.ok) alert(`Delete failed: ${result.error}`);
    setDeletingId(null);
  }

  if (rows.length === 0) {
    return (
      <div
        className="rounded-xl p-8 text-center text-sm"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-default)",
          color: "var(--text-secondary)",
        }}
      >
        No fares match the current filters. Run the GitHub Actions workflow to populate, or add a manual fare above.
      </div>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div
        className="px-4 py-2 text-xs flex items-center justify-between"
        style={{
          background: "var(--bg-subtle)",
          color: "var(--text-tertiary)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <span>
          Showing {totalShown.toLocaleString()} unique fare{totalShown === 1 ? "" : "s"} (from {totalLoaded.toLocaleString()} rows)
        </span>
        <span>Manual overrides win over scraped values</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ color: "var(--text-primary)" }}>
          <thead>
            <tr
              className="text-xs"
              style={{
                background: "var(--bg-subtle)",
                color: "var(--text-tertiary)",
              }}
            >
              <Th>Route</Th>
              <Th>Type</Th>
              <Th>Depart</Th>
              <Th>Return</Th>
              <Th>Airline</Th>
              <Th>Flight</Th>
              <Th className="text-right">Fare (PKR)</Th>
              <Th>Source</Th>
              <Th>Updated</Th>
              <Th className="text-right">Action</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.id}
                style={{
                  borderTop: "1px solid var(--border-default)",
                  background: r.source === "manual" ? "var(--primary-muted, transparent)" : undefined,
                }}
              >
                <Td>
                  {r.origin} → {r.destination}
                </Td>
                <Td>{r.routeType}</Td>
                <Td>{fmtDate(r.departDate)}</Td>
                <Td>{r.returnDate ? fmtDate(r.returnDate) : "—"}</Td>
                <Td>{r.airline}</Td>
                <Td>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {r.flightNumbers?.join(", ") || "—"}
                  </span>
                </Td>
                <Td className="text-right font-medium">{fmtPkr(r.fareTotal)}</Td>
                <Td>
                  <span
                    className="text-xs px-2 py-0.5 rounded"
                    style={{
                      background: r.source === "manual" ? "var(--primary)" : "var(--bg-subtle)",
                      color: r.source === "manual" ? "var(--on-primary)" : "var(--text-secondary)",
                    }}
                  >
                    {r.source}
                  </span>
                </Td>
                <Td>
                  <span style={{ color: "var(--text-tertiary)" }}>{fmtScraped(r.scrapedAt)}</span>
                </Td>
                <Td className="text-right">
                  {r.source === "manual" ? (
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      onClick={() => onDelete(r.id)}
                      className="text-xs"
                      style={{
                        color: "var(--danger, #b91c1c)",
                        opacity: deletingId === r.id ? 0.5 : 1,
                      }}
                    >
                      {deletingId === r.id ? "Removing…" : "Remove"}
                    </button>
                  ) : (
                    <span style={{ color: "var(--text-tertiary)" }} className="text-xs">
                      —
                    </span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left font-medium uppercase tracking-wide ${className}`}>{children}</th>;
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-middle ${className}`}>{children}</td>;
}
