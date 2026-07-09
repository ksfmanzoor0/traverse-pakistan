"use client";

import { useTransition } from "react";

type Props = {
  bookingRef: string;
  deleteAction: (ref: string) => Promise<void>;
};

export function DeleteInvitationButton({ bookingRef, deleteAction }: Props) {
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

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="h-10 px-4 rounded-[var(--radius-sm)] border border-[var(--error)] text-[13px] font-semibold text-[var(--error)] disabled:opacity-50 hover:bg-[var(--error)]/5"
    >
      {pending ? "Deleting…" : "Delete request"}
    </button>
  );
}
