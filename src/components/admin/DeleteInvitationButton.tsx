"use client";

import { useTransition } from "react";

type Props = {
  bookingRef: string;
  deleteAction: (ref: string) => Promise<void>;
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

export function DeleteInvitationButton({ bookingRef, deleteAction, compact }: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`Delete invitation letter ${bookingRef}? This cannot be undone.`)) return;
    startTransition(async () => {
      try {
        await deleteAction(bookingRef);
      } catch (e) {
        alert(e instanceof Error ? e.message : "Delete failed");
      }
    });
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-label={`Delete ${bookingRef}`}
        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12px] font-semibold transition-colors disabled:opacity-50"
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
      className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-sm)] text-[13px] font-semibold disabled:opacity-50"
      style={{
        color: "var(--error)",
        background: "color-mix(in srgb, var(--error) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
      }}
    >
      <TrashIcon size={16} />
      {pending ? "Deleting…" : "Delete request"}
    </button>
  );
}
