"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Row = {
  slug: string;
  name: string;
  destination_slug: string;
  region_slug: string;
  duration: number;
  published: boolean;
  updated_at: string | null;
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
] as const;

type Filter = (typeof STATUS_FILTERS)[number]["value"];

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function PackagesListClient({ rows }: { rows: Row[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "published" && !r.published) return false;
      if (filter === "draft" && r.published) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.slug.toLowerCase().includes(needle) ||
        r.destination_slug.toLowerCase().includes(needle) ||
        r.region_slug.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, filter]);

  const published = rows.filter((r) => r.published).length;

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[240px]">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, slug, destination…"
            className="w-full h-10 px-3 rounded-[var(--radius-sm)] border text-[14px]"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const active = f.value === filter;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                style={{
                  color: active ? "var(--text-inverse)" : "var(--text-secondary)",
                  background: active ? "var(--primary)" : "var(--bg-primary)",
                  border: `1px solid ${active ? "var(--primary)" : "var(--border-default)"}`,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
        {filtered.length} of {rows.length} · {published} published, {rows.length - published} draft
      </p>

      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left" style={{ background: "var(--bg-subtle)", color: "var(--text-tertiary)" }}>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Package</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Destination</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Region</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Days</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Updated</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.slug}
                  style={{ borderTop: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/packages/${r.slug}`}
                      className="font-medium hover:underline"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {r.name}
                    </Link>
                    <div className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
                      {r.slug}
                    </div>
                  </td>
                  <td className="px-4 py-3">{r.destination_slug}</td>
                  <td className="px-4 py-3">{r.region_slug}</td>
                  <td className="px-4 py-3 tabular-nums">{r.duration}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
                      style={{
                        background: r.published
                          ? "color-mix(in srgb, var(--success) 14%, transparent)"
                          : "var(--bg-subtle)",
                        color: r.published ? "var(--success)" : "var(--text-tertiary)",
                      }}
                    >
                      {r.published ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                    {fmt(r.updated_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/packages/${r.slug}`}
                      className="text-[13px] font-semibold"
                      style={{ color: "var(--primary)" }}
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
                    No packages match.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
