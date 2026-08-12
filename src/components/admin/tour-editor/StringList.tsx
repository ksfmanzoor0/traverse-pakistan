"use client";

// Reusable editor for simple string[] fields — highlights, know-before-you-go.
// Reorder with ↑/↓, edit inline, add/delete.
export function StringList({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  function set(i: number, s: string) {
    const next = value.slice();
    next[i] = s;
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
    <div className="space-y-2">
      {value.map((v, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex flex-col">
            <button type="button" onClick={() => move(i, -1)} className="w-6 h-6 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-subtle)]" aria-label="Move up">↑</button>
            <button type="button" onClick={() => move(i, +1)} className="w-6 h-6 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-subtle)]" aria-label="Move down">↓</button>
          </div>
          <textarea
            value={v}
            onChange={(e) => set(i, e.target.value)}
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
      ))}
      <button
        type="button"
        onClick={() => onChange([...value, ""])}
        className="h-9 px-3 text-[12px] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)]/40 rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)]"
      >
        + Add {placeholder ?? "item"}
      </button>
    </div>
  );
}
