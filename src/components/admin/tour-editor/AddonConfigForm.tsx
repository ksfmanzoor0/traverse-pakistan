"use client";

import type { AddonType } from "@/types/tour-addon";

type LegRow = {
  from: string;
  to: string;
  routeType: "ONEWAY" | "RETURN";
  day: number | "last";
  farePerPerson?: number;
  carrier?: string;
};

// Per-type config form. Reads/writes an untyped Record<string,unknown>; each
// type dispatches to a purpose-built subform (no JSON textareas anywhere).
export function AddonConfigForm({
  type,
  config,
  onChange,
}: {
  type: AddonType;
  config: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}) {
  function set(patch: Record<string, unknown>) {
    onChange({ ...config, ...patch });
  }

  if (type === "flight" || type === "bus") {
    const legs = ((config.legs as LegRow[] | undefined) ?? []).map((l) => ({ ...l }));
    return <LegsEditor legs={legs} onChange={(next) => set({ legs: next })} />;
  }

  if (type === "hotel") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Nights" value={(config.nights as number) ?? 1} onChange={(n) => set({ nights: n })} />
        <NumberField label="Fare / person" value={(config.farePerPerson as number) ?? 0} onChange={(n) => set({ farePerPerson: n })} />
        <TextField label="Hotel slug (optional)" value={(config.hotelSlug as string) ?? ""} onChange={(v) => set({ hotelSlug: v || undefined })} />
        <TextField label="Room type (optional)" value={(config.roomType as string) ?? ""} onChange={(v) => set({ roomType: v || undefined })} />
      </div>
    );
  }

  if (type === "meal") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Meals" value={(config.meals as number) ?? 1} onChange={(n) => set({ meals: n })} />
        <NumberField label="Fare / person" value={(config.farePerPerson as number) ?? 0} onChange={(n) => set({ farePerPerson: n })} />
        <div className="col-span-2">
          <TextField label="Description (optional)" value={(config.description as string) ?? ""} onChange={(v) => set({ description: v || undefined })} />
        </div>
      </div>
    );
  }

  // activity / transfer / insurance / custom — same unit shape
  return (
    <div className="grid grid-cols-3 gap-3">
      <NumberField label="Fare / person" value={(config.farePerPerson as number) ?? 0} onChange={(n) => set({ farePerPerson: n })} />
      <NumberField label="Quantity" value={(config.quantity as number) ?? 1} onChange={(n) => set({ quantity: n })} />
      <TextField label="Unit (optional)" value={(config.unit as string) ?? ""} onChange={(v) => set({ unit: v || undefined })} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px]"
      />
    </label>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px]"
      />
    </label>
  );
}

const CITY_SUGGESTIONS = ["{home}", "ISB", "LHE", "KHI", "KDU"] as const;

function LegsEditor({ legs, onChange }: { legs: LegRow[]; onChange: (next: LegRow[]) => void }) {
  function update(i: number, patch: Partial<LegRow>) {
    onChange(legs.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function remove(i: number) {
    onChange(legs.filter((_, idx) => idx !== i));
  }
  function move(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= legs.length) return;
    const next = [...legs];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function add() {
    onChange([
      ...legs,
      { from: "{home}", to: "", routeType: "ONEWAY", day: 1 },
    ]);
  }
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">
        Flight / bus legs
      </div>
      <p className="text-[11px] text-[var(--text-tertiary)] mb-2">
        <code>{"{home}"}</code> in From / To is replaced by the traveler&apos;s home city at quote time.
        Day <code>last</code> = final day of the trip.
      </p>
      <div className="space-y-2">
        {legs.length === 0 && (
          <p className="text-[12px] text-[var(--text-tertiary)]">No legs yet — click Add.</p>
        )}
        {legs.map((leg, i) => {
          const dayIsLast = leg.day === "last";
          return (
            <div key={i} className="border border-[var(--border-default)] rounded-[var(--radius-sm)] p-2 bg-[var(--bg-primary)] space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <CityField label="From" value={leg.from} onChange={(v) => update(i, { from: v })} />
                <CityField label="To" value={leg.to} onChange={(v) => update(i, { to: v })} />
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">Route</span>
                  <select
                    value={leg.routeType}
                    onChange={(e) => update(i, { routeType: e.target.value as "ONEWAY" | "RETURN" })}
                    className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px]"
                  >
                    <option value="ONEWAY">One-way</option>
                    <option value="RETURN">Return</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">Day</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      value={dayIsLast ? "" : (leg.day as number)}
                      disabled={dayIsLast}
                      onChange={(e) => update(i, { day: Number(e.target.value) || 0 })}
                      className="flex-1 h-9 px-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px] disabled:opacity-50"
                    />
                    <label className="flex items-center gap-1 text-[11px]">
                      <input
                        type="checkbox"
                        checked={dayIsLast}
                        onChange={(e) => update(i, { day: e.target.checked ? "last" : 1 })}
                      />
                      last
                    </label>
                  </div>
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">Fare / person (optional)</span>
                  <input
                    type="number"
                    value={leg.farePerPerson ?? ""}
                    onChange={(e) => update(i, { farePerPerson: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Blank = resolved by scraper"
                    className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px]"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">Carrier (optional)</span>
                  <input
                    value={leg.carrier ?? ""}
                    onChange={(e) => update(i, { carrier: e.target.value || undefined })}
                    placeholder="e.g. PIA, Daewoo"
                    className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px]"
                  />
                </label>
                <div className="flex items-end justify-end gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="h-8 w-8 text-[12px] border border-[var(--border-default)] rounded-[var(--radius-sm)] disabled:opacity-40">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === legs.length - 1} className="h-8 w-8 text-[12px] border border-[var(--border-default)] rounded-[var(--radius-sm)] disabled:opacity-40">↓</button>
                  <button type="button" onClick={() => remove(i)} className="h-8 px-3 text-[12px] text-[var(--error)] border border-[var(--error)]/40 rounded-[var(--radius-sm)]">Remove</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 h-8 px-3 text-[12px] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)]/40 rounded-[var(--radius-sm)]"
      >
        + Add leg
      </button>
    </div>
  );
}

function CityField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        list={`${label.toLowerCase()}-city-suggestions`}
        placeholder="ISB, LHE, KHI, KDU, {home}"
        className="w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px]"
      />
      <datalist id={`${label.toLowerCase()}-city-suggestions`}>
        {CITY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
      </datalist>
    </label>
  );
}
