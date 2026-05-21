"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice, getWhatsAppUrl } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import type { BookingStatus, RefundStatus } from "@/types/booking-status";

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
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-default)] last:border-0">
      <span className="text-[13px] text-[var(--text-tertiary)] shrink-0 w-36">{label}</span>
      <span className="text-[13px] font-medium text-[var(--text-primary)] text-right">{value}</span>
    </div>
  );
}

interface Props {
  bookingRef: string;
  data: BookingData;
}

export function BookingDetail({ bookingRef, data }: Props) {
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
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

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
        <div className="p-3 bg-[var(--success)]/10 rounded-[var(--radius-sm)] text-[13px] text-[var(--success)] font-medium">
          Name updated successfully.
        </div>
      )}
      {actionDone === "cancel" && (
        <div className="p-3 bg-[var(--error)]/10 rounded-[var(--radius-sm)] text-[13px] text-[var(--error)] font-medium">
          Your booking has been cancelled. Contact us on WhatsApp for refund queries.
        </div>
      )}

      {/* Booking details card */}
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-5 py-2">
        <Row label="Booking Ref" value={<span className="font-mono">{bookingRef}</span>} />
        <Row label="Contact Name" value={String(localBooking.contact_name ?? "-")} />
        <Row label="Email" value={String(localBooking.contact_email ?? "-")} />
        <Row label="Phone" value={String(localBooking.contact_phone ?? "-")} />
        <Row label="Amount Paid" value={formatPrice(Number(localBooking.total_amount ?? 0))} />

        {type === "package" && (
          <>
            <Row label="Package" value={String(localBooking.package_slug ?? "-").replace(/-/g, " ")} />
            <Row label="Tier" value={String(localBooking.tier ?? "-")} />
            <Row label="Departure City" value={String(localBooking.departure_city ?? "-")} />
            {localBooking.start_date && (
              <Row label="Start Date" value={new Date(String(localBooking.start_date)).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })} />
            )}
            <Row label="Adults" value={String(localBooking.adults ?? "-")} />
            <Row label="Rooms" value={String(localBooking.rooms ?? "-")} />
          </>
        )}

        {type === "hotel" && (
          <>
            <Row label="Hotel" value={String(localBooking.hotel_slug ?? "-").replace(/-/g, " ")} />
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

        <Row label="Booked On" value={localBooking.created_at ? new Date(String(localBooking.created_at)).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "-"} />
      </div>

      {/* Actions */}
      {!isCancelled && (
        <div className="space-y-3">
          {/* Edit name */}
          {!editingName ? (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              className="w-full h-11 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[14px] font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer flex items-center justify-center gap-2"
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
              onClick={() => setCancelling(true)}
              className="w-full h-11 border border-[var(--error)]/40 rounded-[var(--radius-sm)] text-[14px] font-semibold text-[var(--error)] hover:bg-[var(--error)]/5 transition-colors cursor-pointer"
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

      {actionError && (
        <p className="text-center text-[13px] text-[var(--error)] font-medium">{actionError}</p>
      )}
    </div>
  );
}
