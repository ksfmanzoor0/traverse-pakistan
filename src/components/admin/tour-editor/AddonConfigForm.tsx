"use client";

import type { AddonType } from "@/types/tour-addon";

// Per-type config form. Reads/writes an untyped Record<string,unknown> so the
// admin can also enter raw JSON via the flight/bus legs case.
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
    const legs = (config.legs as unknown[]) ?? [];
    const legsJson = JSON.stringify(legs, null, 2);
    return (
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
          Legs (JSON)
        </span>
        <textarea
          value={legsJson}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              if (Array.isArray(parsed)) set({ legs: parsed });
            } catch { /* ignore parse errors while typing */ }
          }}
          rows={10}
          className="w-full px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[12px] font-mono"
        />
        <span className="text-[11px] text-[var(--text-tertiary)] mt-1 block">
          Each leg: {`{ from, to, routeType: "ONEWAY"|"RETURN", day: 1|"last", farePerPerson?, carrier? }`}
          . Use <code>{"{home}"}</code> in <code>from</code>/<code>to</code> for the traveler&apos;s home city.
        </span>
      </label>
    );
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
