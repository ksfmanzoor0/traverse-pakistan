"use client";

import { useTransition } from "react";

type Props = {
  id: string;
  refLabel: string;
  deleteAction: (id: string) => Promise<{ ok: boolean; error?: string }>;
  compact?: boolean;
};

export function DeleteBookingButton({ id, refLabel, deleteAction, compact = true }: Props) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm(`Delete booking ${refLabel}? This cannot be undone.`)) return;
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
        className="text-[12px] font-medium disabled:opacity-50 hover:underline"
        style={{ color: "var(--error)" }}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="h-10 px-4 rounded-[var(--radius-sm)] text-[13px] font-semibold disabled:opacity-50"
      style={{ border: "1px solid var(--error)", color: "var(--error)" }}
    >
      {pending ? "Deleting…" : "Delete booking"}
    </button>
  );
}
