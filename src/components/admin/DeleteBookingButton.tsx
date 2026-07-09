"use client";

import { useTransition } from "react";

type Props = {
  id: string;
  refLabel: string;
  deleteAction: (id: string) => Promise<{ ok: boolean; error?: string }>;
  compact?: boolean;
};

function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" />
    </svg>
  );
}

export function DeleteBookingButton({ id, refLabel, deleteAction, compact = true }: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`Delete ${refLabel}? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteAction(id);
      if (!res.ok) alert(res.error ?? "Delete failed");
    });
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={`Delete ${refLabel}`}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
        style={{
          color: "var(--error)",
          background: "color-mix(in srgb, var(--error) 8%, transparent)",
          border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
        }}
      >
        <TrashIcon />
        {pending ? "Deleting…" : "Delete"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-sm)] text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      style={{
        color: "var(--error)",
        background: "color-mix(in srgb, var(--error) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
      }}
    >
      <TrashIcon size={16} />
      {pending ? "Deleting…" : "Delete booking"}
    </button>
  );
}
