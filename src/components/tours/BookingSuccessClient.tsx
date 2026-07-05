"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatPrice, getWhatsAppUrl } from "@/lib/utils";
import { SITE_CONFIG } from "@/lib/constants";
import { buildIcsDataUri, googleCalendarLink } from "@/components/booking/calendar";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getBookingByRef } from "@/services/booking.service";
import { PayButton } from "@/components/payments/PayButton";
import type { Booking } from "@/types/booking";
import type { Tour } from "@/types/tour";

function SuccessInner({ tour }: { tour: Tour }) {
  const params = useSearchParams();
  const ref = params.get("ref");
  const plan = params.get("plan");
  const urlAmount = params.get("amount");
  const dueNow = urlAmount ? Number(urlAmount) : null;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ref || !isSupabaseConfigured) return;
    getBookingByRef(ref).then(setBooking).catch(() => {});
  }, [ref]);

  async function copyRef() {
    if (!ref) return;
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  const calendarEvent = {
    uid: ref ? `tp-${ref}@traversepakistan.com` : `tp-${tour.slug}@traversepakistan.com`,
    title: `${tour.name} — Traverse Pakistan`,
    description: `Your ${tour.duration}-day tour with Traverse Pakistan. ${ref ? `Booking ref: ${ref}. ` : ""}Meeting point: ${tour.meetingPoint.address} at ${tour.meetingPoint.departureTime}.`,
    location: tour.meetingPoint.address,
    startDate: tour.departureDate,
    durationDays: tour.duration,
  };

  const shareUrl = typeof window !== "undefined" ? window.location.origin + `/grouptours/${tour.slug}` : `https://traversepakistan.com/grouptours/${tour.slug}`;

  async function shareTrip() {
    const shareData = {
      title: tour.name,
      text: `I just booked ${tour.name} with Traverse Pakistan — ${tour.duration} days, ${SITE_CONFIG.stats.rating}★ rated!`,
      url: shareUrl,
    };
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share(shareData);
      } catch {
        /* user cancelled */
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert("Trip link copied to clipboard");
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="mt-8 max-w-[760px] mx-auto">
      <div className="text-center">
        <div
          className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5"
          style={{ background: "var(--primary-light)" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="text-[28px] sm:text-[36px] font-bold text-[var(--text-primary)] tracking-tight">
          Your seat is reserved
        </h1>
        <p className="mt-3 text-[15px] text-[var(--text-secondary)] max-w-[480px] mx-auto">
          We&apos;ve sent confirmation to your email. Our team will reach out on WhatsApp within 2 hours
          with a secure payment link.
        </p>
      </div>

      {ref && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-subtle)]">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">Reference</span>
            <span className="text-[16px] font-mono font-bold text-[var(--text-primary)] tracking-wide">{ref}</span>
            <button
              type="button"
              onClick={copyRef}
              aria-label="Copy booking reference"
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[var(--primary)] hover:underline cursor-pointer"
            >
              {copied ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-6 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden"
           style={{ boxShadow: "var(--shadow-sm)" }}>
        <div className="p-6 order-2 sm:order-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">Your trip</p>
          <h2 className="text-[20px] font-bold text-[var(--text-primary)] tracking-tight mt-1">{tour.name}</h2>

          <dl className="mt-5 grid grid-cols-2 gap-y-3 text-[13px]">
            <dt className="text-[var(--text-tertiary)]">Departure</dt>
            <dd className="text-right text-[var(--text-primary)] font-medium">
              {new Date(tour.departureDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </dd>
            <dt className="text-[var(--text-tertiary)]">Duration</dt>
            <dd className="text-right text-[var(--text-primary)] font-medium">{tour.duration} days</dd>
            <dt className="text-[var(--text-tertiary)]">Meeting point</dt>
            <dd className="text-right text-[var(--text-primary)] font-medium">{tour.meetingPoint.address.split(",")[0]}</dd>
            <dt className="text-[var(--text-tertiary)]">Departure time</dt>
            <dd className="text-right text-[var(--text-primary)] font-medium">{tour.meetingPoint.departureTime}</dd>
            {booking && (
              <>
                <dt className="text-[var(--text-tertiary)]">Travellers</dt>
                <dd className="text-right text-[var(--text-primary)] font-medium">{booking.seats}</dd>
                <dt className="text-[var(--text-tertiary)]">Total</dt>
                <dd className="text-right text-[var(--text-primary)] font-bold tabular-nums">
                  {formatPrice(booking.totalAmount)}
                </dd>
                {dueNow !== null && plan === "installments" && (
                  <>
                    <dt className="text-[var(--text-tertiary)]">Due now (40% deposit)</dt>
                    <dd className="text-right text-[var(--primary)] font-bold tabular-nums">
                      {formatPrice(dueNow)}
                    </dd>
                  </>
                )}
                {dueNow !== null && plan !== "installments" && (
                  <>
                    <dt className="text-[var(--text-tertiary)]">Due now</dt>
                    <dd className="text-right text-[var(--primary)] font-bold tabular-nums">
                      {formatPrice(dueNow)}
                    </dd>
                  </>
                )}
              </>
            )}
          </dl>
        </div>
        {tour.images[0] && (
          <div className="relative w-full sm:w-[200px] h-[180px] sm:h-auto order-1 sm:order-2">
            <Image src={tour.images[0].url} alt={tour.name} fill className="object-cover" sizes="200px" />
          </div>
        )}
      </div>

      {ref && dueNow !== null && (
        <div className="mt-6">
          <PayButton
            flow="tour"
            bookingRef={ref}
            amount={dueNow}
            size="lg"
            showCardIcon
            buttonLabel={`Pay ${formatPrice(dueNow)} now`}
            loadingLabel="Processing…"
          />
          <p className="mt-2 text-center text-[11px] text-[var(--text-tertiary)]">
            Secure card payment via Alfa Bank
          </p>
        </div>
      )}

      <div className="mt-6 p-5 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-md)]">
        <h2 className="text-[14px] font-bold text-[var(--text-primary)] mb-3">What happens next</h2>
        <ol className="space-y-2.5 text-[13px] text-[var(--text-secondary)]">
          {[
            "We confirm your seat and contact you within 2 hours via WhatsApp.",
            "Pay now via Debit or Credit Card, for Bank Transfer or Jazz Cash reach us on WhatsApp — or tap the link in your email/WhatsApp to come back anytime.",
            "Once paid, you receive the full itinerary, packing list, and driver contact.",
            "We stay in touch via WhatsApp from arrival to departure.",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-[var(--text-inverse)] text-[11px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {ref && (
        <form action={`/api/bookings/${encodeURIComponent(ref)}/manage-init`} method="POST" className="mt-6">
          <button
            type="submit"
            className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors active:scale-[0.98] cursor-pointer"
          >
            Manage My Booking
          </button>
        </form>
      )}

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <a
          href={getWhatsAppUrl(`Hi! I just booked ${tour.name}${ref ? ` (ref ${ref})` : ""}. I have a quick question.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 h-[52px] bg-[var(--whatsapp)] text-white text-[15px] font-bold rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
          </svg>
          Chat on WhatsApp
        </a>
        <Link
          href="/grouptours"
          className="flex items-center justify-center h-[52px] border border-[var(--border-default)] text-[15px] font-bold text-[var(--text-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          Browse more Tours
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <a
          href={googleCalendarLink(calendarEvent)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 h-[48px] rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          Add to Google Calendar
        </a>
        <a
          href={buildIcsDataUri(calendarEvent)}
          download={`${tour.slug}.ics`}
          className="flex items-center justify-center gap-2 h-[48px] rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download .ics
        </a>
        <button
          type="button"
          onClick={shareTrip}
          className="flex items-center justify-center gap-2 h-[48px] rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share this trip
        </button>
      </div>

    </div>
  );
}

export function BookingSuccessClient({ tour }: { tour: Tour }) {
  return (
    <Suspense fallback={<div className="mt-10 text-center text-[var(--text-tertiary)]">Loading…</div>}>
      <SuccessInner tour={tour} />
    </Suspense>
  );
}
