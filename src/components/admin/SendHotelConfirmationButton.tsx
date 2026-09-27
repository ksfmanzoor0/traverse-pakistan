"use client";

import { useState, useTransition } from "react";

type Props = {
  bookingRef: string;
  alreadySentAt: string | null;
  sendAction: (bookingRef: string, force?: boolean) => Promise<{ ok: boolean; error?: string }>;
};

export function SendHotelConfirmationButton({ bookingRef, alreadySentAt, sendAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const alreadySent = Boolean(alreadySentAt);
  const label = alreadySent ? "Resend confirmation" : "Send confirmation";

  function onClick() {
    if (alreadySent && !confirm("Confirmation was already sent. Re-send email + WhatsApp with a fresh magic link?")) return;
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await sendAction(bookingRef, alreadySent);
      if (res.ok) setMsg("Sent — email + WhatsApp dispatched (if configured).");
      else setErr(res.error ?? "Send failed");
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center px-4 py-2 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--on-primary,white)] text-[13px] font-semibold hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Sending…" : label}
      </button>
      {msg && <p className="text-[12px] text-[var(--success)]">{msg}</p>}
      {err && <p className="text-[12px] text-[var(--error)]">{err}</p>}
    </div>
  );
}
