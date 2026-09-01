"use client";

import { useMemo, useState, useTransition } from "react";

export type HomeEditorRow = {
  slug: string;
  name: string;
  subtitle?: string | null;
  published: boolean;
  featured: boolean;
  rank: number | null;
  nextDeparture?: string | null;
};

export type HomeEditorSavePayload = Record<
  string,
  { featured: boolean; rank: number | null }
>;

type SaveResult = { ok: boolean; error?: string };

type Props = {
  initial: HomeEditorRow[];
  emptyMessage?: string;
  showFeaturedToggle?: boolean;
  saveAction: (payload: HomeEditorSavePayload) => Promise<SaveResult>;
};

function fmtDeparture(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function sortRows(rows: HomeEditorRow[]): HomeEditorRow[] {
  return [...rows].sort((a, b) => {
    if (a.published !== b.published) return a.published ? -1 : 1;
    const af = a.featured ? 1 : 0;
    const bf = b.featured ? 1 : 0;
    if (af !== bf) return bf - af;
    const ar = a.rank ?? null;
    const br = b.rank ?? null;
    if (ar !== null && br !== null && ar !== br) return ar - br;
    if (ar !== null) return -1;
    if (br !== null) return 1;
    const ad = a.nextDeparture ? new Date(a.nextDeparture).getTime() : Number.MAX_SAFE_INTEGER;
    const bd = b.nextDeparture ? new Date(b.nextDeparture).getTime() : Number.MAX_SAFE_INTEGER;
    if (ad !== bd) return ad - bd;
    return a.name.localeCompare(b.name);
  });
}

function ToggleButton({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${
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

export function HomeFeaturedEditor({ initial, emptyMessage, showFeaturedToggle = true, saveAction }: Props) {
  const [rows, setRows] = useState<HomeEditorRow[]>(() => sortRows(initial));
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const featuredCount = useMemo(() => rows.filter((r) => r.featured && r.published).length, [rows]);

  function bump(slug: string, patch: Partial<HomeEditorRow>) {
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
      // Assign explicit rank to featured rows to preserve the new order
      let rank = 1;
      return next.map((r) => {
        if (showFeaturedToggle && !r.featured) return { ...r, rank: null };
        return { ...r, rank: rank++ };
      });
    });
    setDirty(true);
    setSaveMsg(null);
  }

  function resetOrder() {
    setRows((prev) => sortRows(prev.map((r) => ({ ...r, rank: null }))));
    setDirty(true);
    setSaveMsg(null);
  }

  function save() {
    const payload: HomeEditorSavePayload = {};
    for (const r of rows) {
      payload[r.slug] = {
        featured: showFeaturedToggle ? r.featured : true,
        rank: typeof r.rank === "number" ? r.rank : null,
      };
    }
    startTransition(async () => {
      const res = await saveAction(payload);
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
          {showFeaturedToggle
            ? `${featuredCount} featured on home · ${rows.length} total`
            : `${rows.length} total on home carousel`}
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
            disabled={pending}
            className="px-4 py-2 rounded-[var(--radius-sm)] text-[13px] font-medium bg-[var(--primary)] text-[var(--on-primary,#fff)] disabled:opacity-50"
          >
            {pending ? "Saving…" : dirty ? "Save changes" : "Save & refresh"}
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
              <th className="text-left p-3">Item</th>
              <th className="text-left p-3 w-36">Next departure</th>
              {showFeaturedToggle && <th className="text-center p-3 w-24">Featured</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.slug}
                className={`border-t border-[var(--border-default)] ${!r.published ? "opacity-50" : ""}`}
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
                    {r.subtitle && (
                      <span className="ml-2 font-sans text-[var(--text-secondary)]">
                        · {r.subtitle}
                      </span>
                    )}
                    {!r.published && (
                      <span className="ml-2 inline-block px-1.5 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)] text-[10px] uppercase tracking-wider">
                        unpublished
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-3 text-[var(--text-secondary)]">
                  {fmtDeparture(r.nextDeparture)}
                </td>
                {showFeaturedToggle && (
                  <td className="p-3 text-center">
                    <ToggleButton
                      on={r.featured}
                      onChange={(v) => bump(r.slug, { featured: v })}
                      label="Featured"
                    />
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={showFeaturedToggle ? 5 : 4} className="p-6 text-center text-[var(--text-tertiary)]">
                  {emptyMessage ?? "Nothing to show."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
