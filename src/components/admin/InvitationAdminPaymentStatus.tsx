"use client";

import { useState, useTransition } from "react";

interface Props {
  bookingRef: string;
  currentAdminStatus: string | null;
  fallbackSystemStatus: string;
  saveAction: (ref: string, status: string | null) => Promise<{ ok: boolean; error?: string }>;
}

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "pending_payment", label: "Pending payment" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
  { value: "cancelled", label: "Cancelled" },
];

/**
 * Admin-owned payment status, independent of the Alfa-driven `status` column
 * on invitation_requests. When null, we display the system status as the
 * default hint. When set, it's the value ops trusts.
 */
export function InvitationAdminPaymentStatus({ bookingRef, currentAdminStatus, fallbackSystemStatus, saveAction }: Props) {
  const [value, setValue] = useState<string>(currentAdminStatus ?? fallbackSystemStatus);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dirty = value !== (currentAdminStatus ?? fallbackSystemStatus);
  const hasOverride = currentAdminStatus !== null;

  function save() {
    startTransition(async () => {
      setMsg(null);
      const r = await saveAction(bookingRef, value);
      if (r.ok) {
        setMsg("Saved");
        setTimeout(() => setMsg(null), 2000);
      } else {
        setMsg(r.error ?? "Failed");
      }
    });
  }

  function clearOverride() {
    startTransition(async () => {
      setMsg(null);
      const r = await saveAction(bookingRef, null);
      if (r.ok) {
        setValue(fallbackSystemStatus);
        setMsg("Cleared — now inherits system status");
        setTimeout(() => setMsg(null), 2500);
      } else {
        setMsg(r.error ?? "Failed");
      }
    });
  }

  return (
    <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)]">
      <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
        Admin payment status
      </h2>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-3">
        Independent of Alfa. Set this when the payment actually happened offline,
        or when Alfa reported the wrong outcome. Blank = inherits the system
        status ({fallbackSystemStatus.replace(/_/g, " ")}).
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-9 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)]"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || pending}
          className="h-9 px-4 rounded-[var(--radius-sm)] bg-[var(--primary)] text-white text-[13px] font-semibold disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {hasOverride && (
          <button
            type="button"
            onClick={clearOverride}
            disabled={pending}
            className="h-9 px-3 rounded-[var(--radius-sm)] text-[13px] font-semibold text-[var(--text-secondary)] border border-[var(--border-default)] disabled:opacity-60"
          >
            Clear override
          </button>
        )}
        {msg && <span className="text-[12px] text-[var(--text-secondary)]">{msg}</span>}
      </div>
      {hasOverride && (
        <p className="mt-2 text-[11px] text-[var(--warning)]">
          Override active. This value takes precedence over the Alfa-reported status ({fallbackSystemStatus.replace(/_/g, " ")}).
        </p>
      )}
    </div>
  );
}
