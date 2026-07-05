"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice, getWhatsAppUrl } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import type { BookingStatus, RefundStatus } from "@/types/booking-status";
import { PayButton } from "@/components/payments/PayButton";
import { ManageBanner } from "./ManageBanner";
import { InlineAlert } from "@/components/ui/InlineAlert";

interface BookingData {
  type: "tour" | "package" | "hotel";
  booking: Record<string, unknown>;
}

function statusLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    pending:     { label: "Pending Payment",  color: "var(--warning)" },
    active:      { label: "Confirmed",         color: "var(--success)" },
    cancelled:   { label: "Cancelled",         color: "var(--error)" },
    rescheduled: { label: "Rescheduled",       color: "var(--info)" },
    postponed:   { label: "Postponed",         color: "var(--accent-warm)" },
    completed:   { label: "Completed",         color: "var(--success)" },
  };
  return map[status] ?? { label: status, color: "var(--text-tertiary)" };
}

function refundLabel(status: string): { label: string; color: string } {
  const map: Record<string, { label: string; color: string }> = {
    in_progress: { label: "Refund In Progress", color: "var(--accent-warm)" },
    processed:   { label: "Refund Processed",   color: "var(--success)" },
    failed:      { label: "Refund Failed",       color: "var(--error)" },
  };
  return map[status] ?? { label: status, color: "var(--text-tertiary)" };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-[var(--border-default)] last:border-0">
      <span className="text-[13px] text-[var(--text-tertiary)] shrink-0">{label}</span>
      <span className="text-[13px] font-medium text-[var(--text-primary)] text-right break-words min-w-0">{value}</span>
    </div>
  );
}

function titleCase(s: string): string {
  return s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Props {
  bookingRef: string;
  data: BookingData;
  canManage: boolean;
  needsEmail?: boolean;
}

export function BookingDetail({ bookingRef, data, canManage, needsEmail = false }: Props) {
  const { type, booking } = data;
  const [editingName, setEditingName] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [newName, setNewName] = useState(String(booking.contact_name ?? ""));
  const [localBooking, setLocalBooking] = useState(booking);
  const [actionDone, setActionDone] = useState<"name" | "cancel" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const bookingStatus = String(localBooking.booking_status ?? "pending") as BookingStatus;
  const refundStatus = localBooking.refund_status ? String(localBooking.refund_status) as RefundStatus : null;
  const isCancelled = bookingStatus === "cancelled";
  const statusInfo = statusLabel(bookingStatus);
  const rawPaymentStatus = type === "tour"
    ? String(localBooking.status ?? "pending")
    : String(localBooking.payment_status ?? "pending");
  const isFullyPaid = rawPaymentStatus === "paid" || rawPaymentStatus === "confirmed";
  const isDepositPaid = rawPaymentStatus === "deposit_paid";
  const totalAmount = Number(localBooking.total_amount ?? 0);
  const amountPaid = Number(localBooking.amount_paid ?? 0);
  const balanceDue = Math.max(0, totalAmount - amountPaid);
  const canPayBalance = !isCancelled && isDepositPaid && balanceDue > 0 && (type === "tour" || type === "package");
  const isUnpaid = !isCancelled && !isFullyPaid && !isDepositPaid;
  // First charge on an installments booking is the deposit, not the total.
  // Alfa was already being charged the deposit server-side; the button
  // just needs to promise the right number to the customer.
  const paymentPlan = String(localBooking.payment_plan ?? "full");
  const depositAmount = Number(localBooking.deposit_amount ?? 0);
  const pendingCharge = paymentPlan === "installments" && depositAmount > 0
    ? depositAmount
    : totalAmount;

  // Signal that a previous Alfa handshake happened but no money is captured
  // for the charge the customer is about to make. Two shapes:
  //   Complete Payment path: any attempt happened but amount_paid is still 0
  //   Pay Balance path: attempts >= 2 (deposit + at least one balance try)
  //     while amount_paid still sits at the deposit
  // Not exact — a webhook-deduped retry can also bump payment_attempts — but
  // it catches the common "customer bounced back and the row didn't advance"
  // shape and lets us prompt them to try again.
  const paymentAttempts = Number(localBooking.payment_attempts ?? 0);
  const showRetryBanner =
    (isUnpaid && paymentAttempts > 0) ||
    (canPayBalance && paymentAttempts > 1);

  async function applyNameChange() {
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${bookingRef}/name`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? "Failed to update name.");
        return;
      }
      setLocalBooking((b) => ({ ...b, contact_name: newName }));
      setEditingName(false);
      setActionDone("name");
    } finally {
      setBusy(false);
    }
  }

  async function applyCancel() {
    setActionError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/bookings/${bookingRef}/cancel`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setActionError(data.error ?? "Failed to cancel booking.");
        return;
      }
      setLocalBooking((b) => ({ ...b, booking_status: "cancelled" }));
      setCancelling(false);
      setActionDone("cancel");
    } finally {
      setBusy(false);
    }
  }

  const whatsappUrl = getWhatsAppUrl(`Hi, I need help with my booking ${bookingRef}.`);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
            {type === "hotel" ? "Hotel" : type === "package" ? "Package" : "Tour"} Booking
          </p>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight font-mono">
            {bookingRef}
          </h1>
        </div>
        <span
          className="px-3 py-1.5 text-[12px] font-bold uppercase tracking-wider rounded-[var(--radius-full)]"
          style={{ background: `${statusInfo.color}18`, color: statusInfo.color }}
        >
          {statusInfo.label}
        </span>
      </div>

      {/* Retry banner — surfaces above whichever payment card renders below. */}
      {showRetryBanner && (
        <div className="p-4 border border-[var(--warning)]/40 bg-[var(--warning)]/10 rounded-[var(--radius-md)] flex items-start gap-3">
          <span className="w-6 h-6 rounded-full bg-[var(--warning)]/20 flex items-center justify-center text-[13px] font-bold text-[var(--warning)] shrink-0 mt-0.5">!</span>
          <div className="space-y-1">
            <p className="text-[13px] font-bold text-[var(--text-primary)]">Last payment attempt didn&apos;t go through</p>
            <p className="text-[12px] text-[var(--text-secondary)]">
              You can try again below. If you keep seeing issues, tap <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="underline font-semibold text-[var(--text-primary)]">contact us on WhatsApp</a> and we&apos;ll help.
            </p>
          </div>
        </div>
      )}

      {/* Complete payment CTA — nothing has been captured yet */}
      {isUnpaid && pendingCharge > 0 && (
        <PayButton
          flow={type}
          bookingRef={bookingRef}
          amount={pendingCharge}
          variant="complete-card"
          buttonLabel={`Complete Payment · ${formatPrice(pendingCharge)}`}
        />
      )}

      {/* Balance due — deposit captured, balance still owed */}
      {canPayBalance && (
        <PayButton
          flow="balance"
          bookingRef={bookingRef}
          amount={balanceDue}
          amountPaid={amountPaid}
          totalAmount={totalAmount}
          variant="balance-card"
          buttonLabel={`Pay balance · ${formatPrice(balanceDue)}`}
        />
      )}

      {/* Refund status */}
      {isCancelled && refundStatus && (
        <div className="p-4 rounded-[var(--radius-md)] border"
          style={{ borderColor: `${refundLabel(refundStatus).color}40`, background: `${refundLabel(refundStatus).color}0A` }}>
          <p className="text-[13px] font-semibold" style={{ color: refundLabel(refundStatus).color }}>
            {refundLabel(refundStatus).label}
          </p>
        </div>
      )}

      {/* Action feedback */}
      {actionDone === "name" && (
        <InlineAlert variant="success">Name updated successfully.</InlineAlert>
      )}
      {actionDone === "cancel" && (
        <InlineAlert variant="error">Your booking has been cancelled. Contact us on WhatsApp for refund queries.</InlineAlert>
      )}

      {/* On mobile, surface the verify CTA before the details grid so the
          user knows what's gated. Desktop renders it once below (line ~220). */}
      {!isCancelled && !canManage && (
        <div className="sm:hidden">
          <ManageBanner bookingRef={bookingRef} needsEmail={needsEmail} />
        </div>
      )}

      {/* Booking details — two columns on desktop, stacks on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Your details */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-5 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] pt-3 pb-1">Your details</p>
          <Row label="Contact Name" value={titleCase(String(localBooking.contact_name ?? "-"))} />
          <Row label="Email" value={String(localBooking.contact_email ?? "-")} />
          <Row label="Phone" value={String(localBooking.contact_phone ?? "-")} />
          <Row label="Booked On" value={localBooking.created_at ? new Date(String(localBooking.created_at)).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
        </div>

        {/* Trip details */}
        <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-5 py-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] pt-3 pb-1">Trip details</p>

          <Row label="Booking Ref" value={<span className="font-mono">{bookingRef}</span>} />

          {type === "package" && (
            <>
              <Row label="Package" value={titleCase(String(localBooking.package_slug ?? "-"))} />
              <Row label="Tier" value={titleCase(String(localBooking.tier ?? "-"))} />
              <Row label="Departure City" value={titleCase(String(localBooking.departure_city ?? "-"))} />
              {localBooking.start_date && (
                <Row label="Start Date" value={new Date(String(localBooking.start_date)).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })} />
              )}
              <Row label="Adults" value={String(localBooking.adults ?? "-")} />
              <Row label="Rooms" value={String(localBooking.rooms ?? "-")} />
            </>
          )}

          {type === "hotel" && (
            <>
              <Row label="Hotel" value={titleCase(String(localBooking.hotel_slug ?? "-"))} />
              {localBooking.checkin_date && (
                <Row label="Check-in" value={new Date(String(localBooking.checkin_date)).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })} />
              )}
              {localBooking.checkout_date && (
                <Row label="Check-out" value={new Date(String(localBooking.checkout_date)).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })} />
              )}
              <Row label="Nights" value={String(localBooking.nights ?? "-")} />
              <Row label="Guests" value={`${localBooking.adults ?? 0} adults${Number(localBooking.children) > 0 ? `, ${localBooking.children} children` : ""}`} />
            </>
          )}

          {type === "tour" && (
            <Row label="Seats" value={String(localBooking.seats ?? "-")} />
          )}

          <Row label={isUnpaid ? "Amount Due" : "Amount Paid"} value={formatPrice(isUnpaid ? totalAmount : amountPaid)} />
        </div>
      </div>

      {/* Manage banner — desktop only; mobile renders it above the details
          grid earlier. */}
      {!isCancelled && !canManage && (
        <div className="hidden sm:block">
          <ManageBanner bookingRef={bookingRef} needsEmail={needsEmail} />
        </div>
      )}

      {/* Actions */}
      {!isCancelled && (
        <div className="space-y-3">
          {/* Edit name */}
          {!editingName ? (
            <button
              type="button"
              onClick={() => canManage && setEditingName(true)}
              disabled={!canManage}
              className="w-full h-11 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[14px] font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--border-default)] disabled:hover:text-[var(--text-primary)]"
            >
              <Icon name="edit" size="sm" />
              Edit contact name
            </button>
          ) : (
            <div className="space-y-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Full name"
                className="w-full h-11 px-4 rounded-[var(--radius-sm)] border border-[var(--primary)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none transition-colors"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyNameChange}
                  disabled={busy || !newName.trim() || newName === localBooking.contact_name}
                  className="flex-1 h-10 bg-[var(--primary)] text-[var(--text-inverse)] text-[13px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {busy ? "Saving…" : "Save name"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingName(false); setNewName(String(localBooking.contact_name ?? "")); }}
                  className="flex-1 h-10 border border-[var(--border-default)] text-[13px] text-[var(--text-secondary)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Cancel booking */}
          {!cancelling ? (
            <button
              type="button"
              onClick={() => canManage && setCancelling(true)}
              disabled={!canManage}
              className="w-full h-11 border border-[var(--error)]/40 rounded-[var(--radius-sm)] text-[14px] font-semibold text-[var(--error)] hover:bg-[var(--error)]/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              Cancel booking
            </button>
          ) : (
            <div className="p-4 border border-[var(--error)]/30 rounded-[var(--radius-md)] bg-[var(--error)]/5 space-y-3">
              <p className="text-[13px] text-[var(--text-primary)] font-medium">Are you sure you want to cancel this booking?</p>
              <p className="text-[12px] text-[var(--text-secondary)]">This action cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyCancel}
                  disabled={busy}
                  className="flex-1 h-10 bg-[var(--error)] text-[var(--on-dark)] text-[13px] font-semibold rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
                >
                  {busy ? "Cancelling…" : "Yes, cancel booking"}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelling(false)}
                  className="flex-1 h-10 border border-[var(--border-default)] text-[13px] text-[var(--text-secondary)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  Keep booking
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp help button */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full h-11 flex items-center justify-center gap-2 bg-[var(--whatsapp)] text-[var(--on-dark)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
      >
        <Icon name="whatsapp" size="sm" />
        Contact us for any help
      </a>

      <Link href="/" className="block text-center text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
        Back to home
      </Link>

      {actionError && <InlineAlert>{actionError}</InlineAlert>}
    </div>
  );
}
