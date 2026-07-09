"use client";

import { useState, useTransition } from "react";

type StatusOption = { value: string; label: string };
type Tone = { fg: string; bg: string };

const DEFAULT_TONE: Record<string, Tone> = {
  pending: { fg: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 14%, transparent)" },
  deposit_paid: { fg: "var(--accent-warm)", bg: "color-mix(in srgb, var(--accent-warm) 14%, transparent)" },
  confirmed: { fg: "var(--success)", bg: "color-mix(in srgb, var(--success) 14%, transparent)" },
  cancelled: { fg: "var(--text-tertiary)", bg: "var(--bg-subtle)" },
  refunded: { fg: "var(--error)", bg: "color-mix(in srgb, var(--error) 12%, transparent)" },
};

type Props = {
  id: string;
  initial: string;
  options: StatusOption[];
  updateAction: (id: string, status: string) => Promise<{ ok: boolean; error?: string }>;
};

export function GenericStatusSelect({ id, initial, options, updateAction }: Props) {
  const [status, setStatus] = useState<string>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const tone = DEFAULT_TONE[status] ?? { fg: "var(--text-secondary)", bg: "var(--bg-subtle)" };

  function handleChange(next: string) {
    const previous = status;
    setStatus(next);
    setError(null);
    startTransition(async () => {
      const res = await updateAction(id, next);
      if (!res.ok) {
        setStatus(previous);
        setError(res.error ?? "Update failed");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <label className="relative inline-flex items-center">
        <select
          value={status}
          disabled={pending}
          onChange={(e) => handleChange(e.target.value)}
          className="appearance-none rounded-full px-3 py-1 pr-7 text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2"
          style={{
            color: tone.fg,
            background: tone.bg,
            border: "1px solid transparent",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 w-3 h-3"
          viewBox="0 0 12 12"
          fill="none"
          stroke={tone.fg}
          strokeWidth="1.5"
        >
          <path d="M3 5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </label>
      {error ? (
        <span className="text-[10px]" style={{ color: "var(--error)" }}>{error}</span>
      ) : null}
    </div>
  );
}
