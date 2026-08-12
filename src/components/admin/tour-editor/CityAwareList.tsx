"use client";

import { CityChips } from "./CityChips";
import type { TourListItem } from "@/types/tour";

type Home = "ISB" | "LHE" | "KHI" | "KDU";

// For inclusions / exclusions. Each item = { text, cityOnly? }.
// cityOnly undefined = all cities; otherwise limited to listed homes.
export function CityAwareList({
  value,
  onChange,
}: {
  value: TourListItem[];
  onChange: (next: TourListItem[]) => void;
}) {
  function set(i: number, patch: Partial<TourListItem>) {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }
  function remove(i: number) {
    onChange(value.filter((_, idx) => idx !== i));
  }
  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div className="space-y-3">
      {value.map((item, i) => (
        <div key={i} className="border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex flex-col">
              <button type="button" onClick={() => move(i, -1)} className="w-6 h-6 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-subtle)]">↑</button>
              <button type="button" onClick={() => move(i, +1)} className="w-6 h-6 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-subtle)]">↓</button>
            </div>
            <textarea
              value={item.text}
              onChange={(e) => set(i, { text: e.target.value })}
              rows={1}
              className="flex-1 px-3 py-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px] resize-y"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="h-9 px-2.5 text-[12px] font-semibold text-[var(--error)] rounded hover:bg-[var(--bg-subtle)]"
            >
              Remove
            </button>
          </div>
          <CityChips
            label="Visible for:"
            value={item.cityOnly as Home[] | undefined}
            onChange={(next) => set(i, { cityOnly: next })}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, { text: "" }])}
        className="h-9 px-3 text-[12px] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)]/40 rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)]"
      >
        + Add item
      </button>
    </div>
  );
}
