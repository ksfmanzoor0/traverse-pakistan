"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getNextOpenDeparture } from "@/services/booking.service";
import type { Departure } from "@/types/booking";
import type { Tour } from "@/types/tour";
import type { Review } from "@/types/review";
import { MobileBookingSheet } from "./MobileBookingSheet";
import { hasResumableDraft } from "@/hooks/useCheckoutDraft";

interface MobileReserveBarProps {
  tour: Tour;
  reviews: Review[];
}

export function MobileReserveBar({ tour, reviews }: MobileReserveBarProps) {
  const [open, setOpen] = useState(false);
  const [liveDeparture, setLiveDeparture] = useState<Departure | null>(null);
  const [resume, setResume] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResume(hasResumableDraft(tour.slug) !== null);
  }, [tour.slug]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    getNextOpenDeparture(tour.slug)
      .then((d) => { if (!cancelled) setLiveDeparture(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [tour.slug]);

  const basePrice = tour.pricing.islamabad;
  const seatsLeft = liveDeparture?.seatsAvailable ?? null;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-[var(--bg-primary)] border-t border-[var(--border-default)] px-4 py-3 pb-[env(safe-area-inset-bottom,12px)]"
           style={{ boxShadow: "var(--shadow-lg)" }}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-[var(--text-primary)] tabular-nums">
                {formatPrice(basePrice)}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">/ person</span>
            </div>
            {seatsLeft !== null && seatsLeft <= 6 && seatsLeft > 0 ? (
              <p className="text-[11px] font-bold text-[var(--error)] flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--error)] animate-pulse" />
                Only {seatsLeft} seats left
              </p>
            ) : (
              <p className="text-[11px] text-[var(--text-secondary)]">
                Free cancellation · Reserve now, pay later
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-11 px-5 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-bold rounded-full hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all shrink-0"
          >
            {resume ? "Resume" : "Reserve"}
          </button>
        </div>
      </div>

      <MobileBookingSheet open={open} onClose={() => setOpen(false)} tour={tour} reviews={reviews} />
    </>
  );
}
