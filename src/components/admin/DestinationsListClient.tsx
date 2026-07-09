"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Row = { slug: string; name: string; region: string | null };

export function DestinationsListClient({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(needle) ||
        r.slug.toLowerCase().includes(needle) ||
        (r.region ?? "").toLowerCase().includes(needle),
    );
  }, [rows, q]);

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search destinations…"
        className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px]"
      />

      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden">
        <table className="min-w-full text-[14px]">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[13px]">
            <tr>
              <th className="text-left p-3">Destination</th>
              <th className="text-left p-3">Region</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.slug} className="border-t border-[var(--border-default)]">
                <td className="p-3 text-[var(--text-primary)] font-medium">{d.name}</td>
                <td className="p-3 text-[var(--text-secondary)]">{d.region ?? "—"}</td>
                <td className="p-3 text-[var(--text-tertiary)] font-mono text-[12px]">{d.slug}</td>
                <td className="p-3 text-right">
                  <Link
                    href={`/admin/destinations/${d.slug}`}
                    className="text-[13px] text-[var(--primary)] font-medium"
                  >
                    Manage packages →
                  </Link>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-[var(--text-tertiary)]">
                  No destinations match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
