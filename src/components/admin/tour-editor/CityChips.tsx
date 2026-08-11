"use client";

type Home = "ISB" | "LHE" | "KHI" | "KDU";
const ALL: Home[] = ["ISB", "LHE", "KHI", "KDU"];

// Multi-select chip picker. Empty selection ≡ "all cities" (undefined in the DB).
export function CityChips({
  value,
  onChange,
  label,
}: {
  value: Home[] | undefined | null;
  onChange: (next: Home[] | undefined) => void;
  label?: string;
}) {
  const current = new Set(value ?? []);
  const isAll = current.size === 0;
  function toggle(c: Home) {
    const next = new Set(current);
    next.has(c) ? next.delete(c) : next.add(c);
    onChange(next.size === 0 ? undefined : (Array.from(next) as Home[]));
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {label && <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</span>}
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={`h-7 px-2.5 rounded-full text-[11px] font-semibold border ${
          isAll
            ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]"
            : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
        }`}
      >
        All cities
      </button>
      {ALL.map((c) => {
        const on = current.has(c);
        return (
          <button
            key={c}
            type="button"
            onClick={() => toggle(c)}
            className={`h-7 px-2.5 rounded-full text-[11px] font-semibold border ${
              on
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]"
                : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}
