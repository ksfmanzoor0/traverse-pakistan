"use client";

import { useMemo, useState, useTransition } from "react";

type Row = {
  slug: string;
  name: string;
  duration: number;
  isPrimary: boolean;
  published: boolean;
  hidden: boolean;
  featured: boolean;
  rank: number | null;
};

type SaveResult = { ok: boolean; error?: string };

type Props = {
  destinationSlug: string;
  initial: Row[];
  saveAction: (
    destinationSlug: string,
    payload: Record<string, {
      entry: { rank?: number; hidden?: boolean; featured?: boolean };
      published: boolean;
    }>,
  ) => Promise<SaveResult>;
};

function sortRows(rows: Row[]): Row[] {
  return [...rows].sort((a, b) => {
    const fa = a.featured ? 1 : 0;
    const fb = b.featured ? 1 : 0;
    if (fa !== fb) return fb - fa;
    const ra = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rb = b.rank ?? Number.MAX_SAFE_INTEGER;
    if (ra !== rb) return ra - rb;
    const pa = a.isPrimary ? 0 : 1;
    const pb = b.isPrimary ? 0 : 1;
    return pa - pb;
  });
}

function ToggleButton({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        on ? "bg-[var(--primary)]" : "bg-[var(--border-default)]"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          on ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function DestinationPackagesEditor({ destinationSlug, initial, saveAction }: Props) {
  const [rows, setRows] = useState<Row[]>(() => sortRows(initial));
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const visibleCount = useMemo(
    () => rows.filter((r) => r.published && !r.hidden).length,
    [rows],
  );

  function bump(slug: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.slug === slug ? { ...r, ...patch } : r)));
    setDirty(true);
    setSaveMsg(null);
  }

  function move(index: number, delta: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const j = index + delta;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      // Assign explicit ranks so ordering persists
      return next.map((r, i) => ({ ...r, rank: i + 1 }));
    });
    setDirty(true);
    setSaveMsg(null);
  }

  function resetOrder() {
    setRows((prev) => prev.map((r) => ({ ...r, rank: null })));
    setDirty(true);
    setSaveMsg(null);
  }

  function save() {
    const payload: Record<string, {
      entry: { rank?: number; hidden?: boolean; featured?: boolean };
      published: boolean;
    }> = {};
    for (const r of rows) {
      const e: { rank?: number; hidden?: boolean; featured?: boolean } = {};
      if (typeof r.rank === "number") e.rank = r.rank;
      if (r.hidden) e.hidden = true;
      if (r.featured) e.featured = true;
      payload[r.slug] = { entry: e, published: r.published };
    }
    startTransition(async () => {
      const res = await saveAction(destinationSlug, payload);
      if (res.ok) {
        setSaveMsg("Saved.");
        setDirty(false);
      } else {
        setSaveMsg(res.error ?? "Save failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-[14px] text-[var(--text-secondary)]">
          {visibleCount} of {rows.length} package{rows.length === 1 ? "" : "s"} visible on public page.
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={resetOrder}
            className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
          >
            Reset order
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !dirty}
            className="px-4 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium bg-[var(--primary)] text-[var(--on-primary,#fff)] disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {saveMsg && (
        <div className="text-[13px] text-[var(--text-secondary)]">{saveMsg}</div>
      )}

      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden">
        <table className="min-w-full text-[13px]">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-tertiary)] text-[12px] uppercase tracking-wider">
            <tr>
              <th className="text-left p-3 w-20">Move</th>
              <th className="text-left p-3 w-24">Order #</th>
              <th className="text-left p-3">Package</th>
              <th className="text-left p-3 w-20">Days</th>
              <th className="text-center p-3 w-24">Published</th>
              <th className="text-center p-3 w-24">Featured</th>
              <th className="text-center p-3 w-24">Hidden</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.slug}
                className={`border-t border-[var(--border-default)] ${r.hidden ? "opacity-50" : ""}`}
              >
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label="Move up"
                      className="w-6 h-6 rounded border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === rows.length - 1}
                      aria-label="Move down"
                      className="w-6 h-6 rounded border border-[var(--border-default)] text-[var(--text-secondary)] disabled:opacity-30"
                    >
                      ↓
                    </button>
                  </div>
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    min={1}
                    value={r.rank ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      bump(r.slug, { rank: v === "" ? null : Math.max(1, Number(v)) });
                    }}
                    placeholder="—"
                    className="w-16 px-2 py-1 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px]"
                  />
                </td>
                <td className="p-3">
                  <div className="text-[var(--text-primary)] font-medium">{r.name}</div>
                  <div className="text-[12px] text-[var(--text-tertiary)] font-mono mt-0.5">
                    {r.slug}
                    {!r.isPrimary && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[10px] uppercase tracking-wider">
                        related
                      </span>
                    )}
                    {!r.published && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)] text-[10px] uppercase tracking-wider">
                        unpublished
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-[var(--text-secondary)]">{r.duration}</td>
                <td className="p-3 text-center">
                  <ToggleButton
                    on={r.published}
                    onChange={(v) => bump(r.slug, { published: v })}
                    label="Published"
                  />
                </td>
                <td className="p-3 text-center">
                  <ToggleButton
                    on={r.featured}
                    onChange={(v) => bump(r.slug, { featured: v })}
                    label="Featured"
                  />
                </td>
                <td className="p-3 text-center">
                  <ToggleButton
                    on={r.hidden}
                    onChange={(v) => bump(r.slug, { hidden: v })}
                    label="Hidden"
                  />
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[var(--text-tertiary)]">
                  No packages currently link to this destination.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
