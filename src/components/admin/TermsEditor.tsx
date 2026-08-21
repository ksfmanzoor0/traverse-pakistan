"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TermsContent, CancellationRow } from "@/lib/supabase/types";
import { updateTerms } from "@/app/admin/terms/actions";

const inputStyle: React.CSSProperties = {
  background: "var(--bg-primary)",
  border: "1px solid var(--border-default)",
  color: "var(--text-primary)",
};

type TieredKey = "group" | "private" | "transport";
const CANCELLATION_KEYS: Array<{ key: TieredKey; label: string }> = [
  { key: "group", label: "Group / Public Tours" },
  { key: "private", label: "Custom / Private Tours" },
  { key: "transport", label: "Transport Service" },
];

export function TermsEditor({ initial }: { initial: TermsContent }) {
  const router = useRouter();
  const [state, setState] = useState<TermsContent>(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function patchTop<K extends keyof TermsContent>(k: K, v: TermsContent[K]) {
    setState((s) => ({ ...s, [k]: v }));
    setDirty(true);
  }
  function patchCancel(k: TieredKey, v: CancellationRow[]): void;
  function patchCancel(k: "hotelsAirlinesNote", v: string): void;
  function patchCancel(
    k: keyof TermsContent["cancellation"],
    v: CancellationRow[] | string,
  ) {
    setState((s) => ({
      ...s,
      cancellation: { ...s.cancellation, [k]: v },
    }));
    setDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateTerms(state);
      if (!res.ok) return setError(res.error);
      setDirty(false);
      setSavedAt(new Date());
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <Section title="Intro paragraph">
        <textarea
          value={state.intro}
          onChange={(e) => patchTop("intro", e.target.value)}
          rows={4}
          className="w-full px-3 py-2 rounded text-sm"
          style={inputStyle}
        />
      </Section>

      <Section title="Code of Conduct">
        <ListEditor
          items={state.codeOfConduct}
          onChange={(v) => patchTop("codeOfConduct", v)}
          placeholder="Add a code-of-conduct rule…"
        />
      </Section>

      <Section title="Cancellation tiers">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {CANCELLATION_KEYS.map(({ key, label }) => (
            <div key={key}>
              <h3
                className="text-sm font-semibold mb-2"
                style={{ color: "var(--text-secondary)" }}
              >
                {label}
              </h3>
              <RowsEditor
                rows={state.cancellation[key]}
                onChange={(v) => patchCancel(key, v)}
              />
            </div>
          ))}

          <div>
            <h3
              className="text-sm font-semibold mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              Hotels &amp; Airline Tickets (note)
            </h3>
            <textarea
              value={state.cancellation.hotelsAirlinesNote}
              onChange={(e) =>
                patchCancel("hotelsAirlinesNote", e.target.value)
              }
              rows={4}
              className="w-full px-3 py-2 rounded text-sm"
              style={inputStyle}
            />
          </div>
        </div>
      </Section>

      <Section title="Flight cancellation / road closure">
        <textarea
          value={state.flightCancellation}
          onChange={(e) => patchTop("flightCancellation", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded text-sm"
          style={inputStyle}
        />
      </Section>

      <Section title="Refund policy">
        <textarea
          value={state.refund}
          onChange={(e) => patchTop("refund", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded text-sm"
          style={inputStyle}
        />
      </Section>

      {error && (
        <div
          className="text-xs px-3 py-2 rounded"
          style={{ background: "var(--error)/10", color: "var(--error)" }}
        >
          {error}
        </div>
      )}

      <div
        className="pt-4 flex items-center justify-between gap-3 border-t"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {dirty
            ? "Unsaved changes"
            : savedAt
              ? `Saved at ${savedAt.toLocaleTimeString()}`
              : "No changes"}
        </div>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="h-10 px-5 rounded font-semibold text-sm disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--text-inverse)",
          }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl p-5"
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border-default)",
      }}
    >
      <h2
        className="text-sm font-semibold uppercase tracking-wider mb-3"
        style={{ color: "var(--text-tertiary)" }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function ListEditor({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  function updateAt(i: number, v: string) {
    const next = items.slice();
    next[i] = v;
    onChange(next);
  }
  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div className="space-y-2">
      {items.map((v, i) => (
        <div key={i} className="flex gap-2 items-start">
          <span
            className="shrink-0 mt-2 text-xs font-mono"
            style={{ color: "var(--text-tertiary)" }}
          >
            {i + 1}.
          </span>
          <textarea
            value={v}
            onChange={(e) => updateAt(i, e.target.value)}
            rows={2}
            className="flex-1 px-3 py-2 rounded text-sm"
            style={inputStyle}
          />
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="h-6 px-2 text-xs rounded disabled:opacity-30"
              style={{ color: "var(--text-secondary)" }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, +1)}
              disabled={i === items.length - 1}
              className="h-6 px-2 text-xs rounded disabled:opacity-30"
              style={{ color: "var(--text-secondary)" }}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="h-6 px-2 text-xs font-semibold rounded"
              style={{ color: "var(--error)" }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, ""])}
        className="h-8 px-3 rounded text-xs font-semibold"
        style={{
          background: "var(--primary-muted)",
          color: "var(--primary)",
        }}
      >
        + {placeholder ?? "Add"}
      </button>
    </div>
  );
}

function RowsEditor({
  rows,
  onChange,
}: {
  rows: CancellationRow[];
  onChange: (next: CancellationRow[]) => void;
}) {
  function updateAt(i: number, patch: Partial<CancellationRow>) {
    const next = rows.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex gap-2 items-center">
          <input
            value={r.days}
            onChange={(e) => updateAt(i, { days: e.target.value })}
            placeholder="e.g. 14 days before"
            className="flex-1 h-9 px-2 rounded text-sm"
            style={inputStyle}
          />
          <input
            value={r.charge}
            onChange={(e) => updateAt(i, { charge: e.target.value })}
            placeholder="e.g. 50% charges"
            className="flex-1 h-9 px-2 rounded text-sm"
            style={inputStyle}
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={i === 0}
              className="h-8 px-2 text-xs rounded disabled:opacity-30"
              style={{ color: "var(--text-secondary)" }}
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => move(i, +1)}
              disabled={i === rows.length - 1}
              className="h-8 px-2 text-xs rounded disabled:opacity-30"
              style={{ color: "var(--text-secondary)" }}
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, j) => j !== i))}
              className="h-8 px-2 text-xs font-semibold rounded"
              style={{ color: "var(--error)" }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...rows, { days: "", charge: "" }])}
        className="h-8 px-3 rounded text-xs font-semibold"
        style={{
          background: "var(--primary-muted)",
          color: "var(--primary)",
        }}
      >
        + Add tier
      </button>
    </div>
  );
}
