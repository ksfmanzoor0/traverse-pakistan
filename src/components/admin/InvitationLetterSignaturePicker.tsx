"use client";

import { useState, useTransition } from "react";
import type { SignatureSlot } from "@/lib/invitation/config";

type Props = {
  bookingRef: string;
  slots: SignatureSlot[];
  currentSlot: number | null;
  saveAction: (ref: string, slot: number | null) => Promise<{ ok: boolean; error?: string }>;
};

export function InvitationLetterSignaturePicker({ bookingRef, slots, currentSlot, saveAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<number>(currentSlot ?? 0);
  const [msg, setMsg] = useState<string | null>(null);

  function slotDisabled(i: number) {
    return !slots[i]?.dataUrl;
  }

  function slotLabel(i: number) {
    const s = slots[i];
    if (!s) return `Slot ${i + 1}`;
    const suffix = s.dataUrl ? "" : " (empty)";
    return `${s.label?.trim() || `Slot ${i + 1}`}${suffix}`;
  }

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = Number(e.target.value);
    setSelected(v);
    startTransition(async () => {
      const res = await saveAction(bookingRef, v);
      setMsg(res.ok ? "Saved." : res.error ?? "Save failed");
      setTimeout(() => setMsg(null), 2500);
    });
  }

  const signedHref = `/api/admin/invitation-letter/${bookingRef}/pdf`;
  const unsignedHref = `${signedHref}?unsigned=1`;

  return (
    <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-subtle)] flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-[13px] text-[var(--text-secondary)]">Sign with:</label>
        <select
          value={selected}
          onChange={onChange}
          disabled={pending}
          className="h-9 px-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)]"
        >
          {slots.map((_, i) => (
            <option key={i} value={i} disabled={slotDisabled(i)}>{slotLabel(i)}</option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <a href={signedHref} target="_blank" rel="noopener"
          className="h-9 px-3 inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[13px] font-semibold">
          Download signed PDF
        </a>
        <a href={unsignedHref} target="_blank" rel="noopener"
          className="h-9 px-3 inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[13px] font-semibold text-[var(--text-primary)]">
          Download unsigned PDF
        </a>
      </div>
      {msg && <span className="text-[12px] text-[var(--text-secondary)]">{msg}</span>}
    </div>
  );
}
