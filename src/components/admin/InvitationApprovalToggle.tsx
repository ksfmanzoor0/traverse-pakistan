"use client";

import { useState, useTransition } from "react";

type Props = {
  bookingRef: string;
  initialApproved: boolean;
  initialApprovedAt: string | null;
  saveAction: (
    ref: string,
    approved: boolean,
  ) => Promise<{ ok: boolean; error?: string }>;
};

/**
 * Gate for the invitation-letter payment page: when toggled on, the
 * applicant's view switches from an amber "Pending review" badge to a
 * green "Approved" badge. The Pay button is always clickable; this is
 * informational, not a hard block.
 */
export function InvitationApprovalToggle({
  bookingRef,
  initialApproved,
  initialApprovedAt,
  saveAction,
}: Props) {
  const [approved, setApproved] = useState<boolean>(initialApproved);
  const [approvedAt, setApprovedAt] = useState<string | null>(initialApprovedAt);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function toggle() {
    const next = !approved;
    const previous = approved;
    const previousAt = approvedAt;
    setApproved(next);
    setApprovedAt(next ? new Date().toISOString() : null);
    setErr(null);
    startTransition(async () => {
      const res = await saveAction(bookingRef, next);
      if (!res.ok) {
        setApproved(previous);
        setApprovedAt(previousAt);
        setErr(res.error ?? "Save failed");
      }
    });
  }

  const label = approved ? "Approved for payment" : "Not approved for payment";
  const bg = approved
    ? "color-mix(in srgb, var(--success) 14%, transparent)"
    : "color-mix(in srgb, var(--warning) 14%, transparent)";
  const fg = approved ? "var(--success)" : "var(--warning)";

  return (
    <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div
            className="inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold uppercase tracking-wider"
            style={{ background: bg, color: fg }}
          >
            {label}
          </div>
          {approved && approvedAt && (
            <p className="text-[12px] text-[var(--text-tertiary)] mt-2">
              Approved at {new Date(approvedAt).toLocaleString("en-GB", {
                day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
              })}
            </p>
          )}
          {!approved && (
            <p className="text-[12px] text-[var(--text-tertiary)] mt-2">
              Applicant sees a &ldquo;Pending review&rdquo; badge until you approve.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          className="h-10 px-4 rounded-[var(--radius-sm)] text-[13px] font-semibold disabled:opacity-50"
          style={{
            background: approved ? "var(--bg-primary)" : "var(--primary)",
            color: approved ? "var(--text-primary)" : "var(--on-primary, white)",
            border: approved ? "1px solid var(--border-default)" : "1px solid var(--primary)",
          }}
        >
          {pending ? "Saving…" : approved ? "Un-approve" : "Approve for payment"}
        </button>
      </div>
      {err && <p className="text-[12px] text-[var(--error)]">{err}</p>}
    </div>
  );
}
