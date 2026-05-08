"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { StarRating } from "@/components/ui/StarRating";
import type { Tour } from "@/types/tour";
import type { Review } from "@/types/review";
import type { Departure } from "@/types/booking";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getNextOpenDeparture } from "@/services/booking.service";
import { UrgencyStrip } from "@/components/booking/UrgencyStrip";
import { ReviewQuoteCard } from "@/components/booking/ReviewQuoteCard";
import { calculatePricing } from "@/components/booking/pricing";
import { deriveUrgency } from "@/components/booking/urgency";
import { Stepper } from "@/components/booking/Stepper";
import { hasResumableDraft } from "@/hooks/useCheckoutDraft";

interface BookingSidebarProps {
  tour: Tour;
  reviews?: Review[];
}

export function BookingSidebar({ tour, reviews = [] }: BookingSidebarProps) {
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [singleRooms, setSingleRooms] = useState(0);
  const [departure, setDeparture] = useState<"islamabad" | "lahore" | "karachi">("islamabad");
  const [cityDepartures, setCityDepartures] = useState<{ islamabad: Departure | null; lahore: Departure | null; karachi: Departure | null }>({ islamabad: null, lahore: null, karachi: null });
  const [departuresLoaded, setDeparturesLoaded] = useState(false);
  const [resumeAvailable, setResumeAvailable] = useState(false);

  // Pre-fill from search widget session
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tp_search");
      if (!raw) return;
      const s = JSON.parse(raw) as {
        travelers?: { adults: number; children: number; infants: number };
      };
      if (s.travelers) {
        setAdults(Math.max(1, s.travelers.adults));
        setChildren(s.travelers.children);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResumeAvailable(hasResumableDraft(tour.slug) !== null);
  }, [tour.slug]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    Promise.all([
      getNextOpenDeparture(tour.slug, "islamabad"),
      getNextOpenDeparture(tour.slug, "lahore"),
      getNextOpenDeparture(tour.slug, "karachi"),
    ])
      .then(([isb, lhr, khi]) => {
        if (!cancelled) {
          setCityDepartures({ islamabad: isb, lahore: lhr, karachi: khi });
          setDeparturesLoaded(true);
        }
      })
      .catch(() => { if (!cancelled) setDeparturesLoaded(true); });
    return () => { cancelled = true; };
  }, [tour.slug]);

  const liveDeparture = cityDepartures[departure] ?? null;

  const pricing = calculatePricing({
    tour,
    liveDeparture,
    departureCity: departure,
    adults,
    childCount: children,
    singleRooms,
    paymentPlan: "full",
  });

  const urgency = deriveUrgency(tour, liveDeparture);
  const totalTravelers = adults + children;
  const maxSeats = liveDeparture?.maxSeats ?? tour.maxGroupSize;
  const seatCap = liveDeparture ? Math.min(maxSeats, liveDeparture.seatsAvailable) : maxSeats;

  const checkoutHref = `/grouptours/${tour.slug}/checkout?departure=${departure}&adults=${adults}&children=${children}&singleRooms=${singleRooms}`;

  return (
    <div className="sticky top-[120px] space-y-4">
      <div
        className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-6"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <UrgencyStrip signals={urgency} compact />

        <div className="mt-3 flex items-baseline gap-2 flex-wrap">
          <span className="text-[26px] font-bold text-[var(--text-primary)] tabular-nums leading-none">
            {formatPrice(pricing.basePrice)}
          </span>
          {tour.originalPrice && (
            <span className="text-base text-[var(--text-tertiary)] line-through tabular-nums">
              {formatPrice(tour.originalPrice)}
            </span>
          )}
          <span className="text-[13px] text-[var(--text-tertiary)]">/ person</span>
        </div>

        <div className="mt-1.5">
          <StarRating rating={tour.rating} reviewCount={tour.reviewCount} size="sm" />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--text-secondary)]">
          {tour.freeCancellation && <TrustItem>Free cancellation</TrustItem>}
          {tour.reserveNowPayLater && <TrustItem>Reserve, pay later</TrustItem>}
          <TrustItem>Lowest price guarantee</TrustItem>
        </div>

        <hr className="my-5 border-[var(--border-default)]" />

        {(() => {
          const availableCities = (["islamabad", "lahore", "karachi"] as const).filter(
            (c) => departuresLoaded ? cityDepartures[c] !== null : c !== "karachi" && !!tour.pricing.lahore,
          );
          if (availableCities.length < 2) return null;
          return (
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
                Departure city
              </label>
              <div className={`grid gap-2 ${availableCities.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                {availableCities.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => setDeparture(city)}
                    className={`h-10 rounded-[var(--radius-sm)] text-[13px] font-semibold border transition-colors cursor-pointer capitalize ${
                      departure === city
                        ? "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary)]"
                        : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--primary)]"
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        <div className="mb-4">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
            Departure date
          </label>
          <div className="h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] flex items-center justify-between text-[13px] bg-[var(--bg-subtle)]">
            <span className="text-[var(--text-primary)] font-medium">
              {new Date((liveDeparture?.departureDate ?? tour.departureDate)).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {liveDeparture && liveDeparture.seatsAvailable <= 6 && liveDeparture.seatsAvailable > 0 && (
              <span className="text-[11px] font-bold text-[var(--error)]">
                {liveDeparture.seatsAvailable} left
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block">
            Travellers
          </label>
          <Stepper
            label="Adults"
            sub="Age 13+"
            value={adults}
            min={1}
            max={seatCap - children}
            onDecrement={() => setAdults(Math.max(1, adults - 1))}
            onIncrement={() => setAdults(Math.min(seatCap - children, adults + 1))}
          />
          <Stepper
            label="Children"
            sub="Ages 2–12 · 50% off"
            value={children}
            min={0}
            max={seatCap - adults}
            onDecrement={() => setChildren(Math.max(0, children - 1))}
            onIncrement={() => setChildren(Math.min(seatCap - adults, children + 1))}
          />
          {tour.pricing.singleSupplement && (
            <Stepper
              label="Single rooms"
              sub={`+ ${formatPrice(tour.pricing.singleSupplement)} / room`}
              value={singleRooms}
              min={0}
              max={totalTravelers}
              onDecrement={() => setSingleRooms(Math.max(0, singleRooms - 1))}
              onIncrement={() => setSingleRooms(Math.min(totalTravelers, singleRooms + 1))}
            />
          )}
        </div>

        {pricing.groupDiscountPct > 0 && (
          <p className="mt-4 text-[11px] font-semibold text-[var(--success)] flex items-center gap-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Group discount · {Math.round(pricing.groupDiscountPct * 100)}% off applied
          </p>
        )}

        <div className="mt-5 pt-4 border-t border-[var(--border-default)] space-y-1.5">
          <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
            <span>{totalTravelers} traveller{totalTravelers > 1 ? "s" : ""}</span>
            <span className="tabular-nums">{formatPrice(pricing.subtotal)}</span>
          </div>
          {pricing.groupDiscountAmount > 0 && (
            <div className="flex items-center justify-between text-[12px] text-[var(--success)] font-medium">
              <span>Group discount</span>
              <span className="tabular-nums">− {formatPrice(pricing.groupDiscountAmount)}</span>
            </div>
          )}
          {pricing.singleSupplementTotal > 0 && (
            <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
              <span>Single rooms</span>
              <span className="tabular-nums">{formatPrice(pricing.singleSupplementTotal)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-default)]">
            <span className="text-[14px] text-[var(--text-secondary)]">Total</span>
            <span className="text-[20px] font-bold text-[var(--text-primary)] tabular-nums">
              {formatPrice(pricing.total)}
            </span>
          </div>
        </div>

        <Link
          href={checkoutHref}
          className="mt-5 w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] flex items-center justify-center gap-2 hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all"
        >
          {resumeAvailable ? "Resume booking" : "Reserve — no charge yet"}
        </Link>

        <p className="mt-3 text-center text-[11px] text-[var(--text-tertiary)] flex items-center justify-center gap-1.5">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          Free to reserve · Pay later · Avg reply in 1 hour
        </p>
      </div>

      {reviews.length > 0 && <ReviewQuoteCard reviews={reviews} compact />}
    </div>
  );
}

function TrustItem({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {children}
    </span>
  );
}
