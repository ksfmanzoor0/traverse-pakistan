"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { StarRating } from "@/components/ui/StarRating";
import type { Tour } from "@/types/tour";
import type { Review } from "@/types/review";
import type { Departure } from "@/types/booking";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getUpcomingOpenDepartures } from "@/services/booking.service";
import { UrgencyStrip } from "@/components/booking/UrgencyStrip";
import { ReviewQuoteCard } from "@/components/booking/ReviewQuoteCard";
import { calculatePricing } from "@/components/booking/pricing";
import { deriveUrgency } from "@/components/booking/urgency";
import { Stepper } from "@/components/booking/Stepper";
import { hasResumableDraft } from "@/hooks/useCheckoutDraft";
import { useSharedDepartureCity } from "@/hooks/useSharedDepartureCity";
import {
  AddonPicker,
  defaultSelectedIds,
  sumSelectedAddons,
} from "@/components/booking/AddonPicker";

interface BookingSidebarProps {
  tour: Tour;
  reviews?: Review[];
  /** Preview override from ?preview= URL. Real customers don't set this. */
  previewCity?: "islamabad" | "lahore" | "karachi" | "skardu" | null;
}

export function BookingSidebar({ tour, reviews = [], previewCity = null }: BookingSidebarProps) {
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [singleRooms, setSingleRooms] = useState(0);
  const [singleOccupancyRooms, setSingleOccupancyRooms] = useState(0);
  const CODE_TO_CITY = { ISB: "islamabad", LHE: "lahore", KHI: "karachi", KDU: "skardu" } as const;
  const firstAddonCode = (tour.addonCities?.[0] ?? null) as "ISB" | "LHE" | "KHI" | "KDU" | null;
  const initialDeparture: "islamabad" | "lahore" | "karachi" | "skardu" =
    previewCity
    ?? (tour.anchorCity ? CODE_TO_CITY[tour.anchorCity] : null)
    ?? (firstAddonCode ? CODE_TO_CITY[firstAddonCode] : null)
    ?? "islamabad";
  const [departure, setDeparture] = useSharedDepartureCity(initialDeparture, tour.slug);
  const [allDepartures, setAllDepartures] = useState<Departure[]>([]);
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);
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
      const widgetOpened = sessionStorage.getItem("tp_search_opened");
      if (s.travelers && widgetOpened) {
        setAdults(Math.max(1, s.travelers.adults));
        setChildren(s.travelers.children);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResumeAvailable(hasResumableDraft(tour.slug) !== null);
  }, [tour.slug]);

  // Clamp private-room selections when adults drops so a disabled couple/single
  // row doesn't silently keep contributing to the total.
  useEffect(() => {
    const solos = Math.min(singleOccupancyRooms, adults);
    const couples = Math.min(singleRooms, Math.max(0, Math.floor((adults - solos) / 2)));
    if (solos !== singleOccupancyRooms) setSingleOccupancyRooms(solos);
    if (couples !== singleRooms) setSingleRooms(couples);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adults]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    getUpcomingOpenDepartures(tour.slug)
      .then((list) => {
        if (!cancelled) {
          setAllDepartures(list);
          setDeparturesLoaded(true);
        }
      })
      .catch(() => { if (!cancelled) setDeparturesLoaded(true); });
    return () => { cancelled = true; };
  }, [tour.slug]);

  // All tours use NULL departure_city rows; city variance handled by addons.
  const departuresForCity = allDepartures;
  useEffect(() => {
    if (departuresForCity.length === 0) {
      setSelectedDepartureId(null);
      return;
    }
    if (!selectedDepartureId || !departuresForCity.some((d) => d.id === selectedDepartureId)) {
      setSelectedDepartureId(departuresForCity[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [departure, allDepartures.length]);

  const liveDeparture = departuresForCity.find((d) => d.id === selectedDepartureId) ?? departuresForCity[0] ?? null;

  // Addon list + selection state — read straight from the Tour object
  // (tour.service.ts precomputes it server-side per 1h `tours` cache tick).
  // No client fetch = instant city switch. Selection state is per-city so
  // switching back preserves what the user picked.
  const cityToHome: Record<"islamabad" | "lahore" | "karachi" | "skardu", "ISB" | "LHE" | "KHI" | "KDU"> = {
    islamabad: "ISB", lahore: "LHE", karachi: "KHI", skardu: "KDU",
  };
  const homeCityCode = cityToHome[departure];
  const cityAddons = useMemo(() => tour.addonsByCity?.[homeCityCode] ?? [], [tour.addonsByCity, homeCityCode]);
  const [selectedByCity, setSelectedByCity] = useState<Record<string, Set<string>>>({});
  const selectedIds = selectedByCity[homeCityCode] ?? defaultSelectedIds(cityAddons);
  useEffect(() => {
    setSelectedByCity((prev) => (prev[homeCityCode] ? prev : { ...prev, [homeCityCode]: defaultSelectedIds(cityAddons) }));
  }, [homeCityCode, cityAddons]);
  const setSelected = (next: Set<string>) => setSelectedByCity((prev) => ({ ...prev, [homeCityCode]: next }));
  const onToggle = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const onRadioSelect = (groupKey: string, id: string) => {
    const next = new Set(selectedIds);
    for (const a of cityAddons) if (a.groupKey === groupKey) next.delete(a.id);
    next.add(id);
    setSelected(next);
  };
  const addonPerPerson = sumSelectedAddons(cityAddons, selectedIds);

  const pricing = calculatePricing({
    tour,
    liveDeparture,
    departureCity: departure,
    adults,
    childCount: children,
    singleRooms,
    singleOccupancyRooms,
    paymentPlan: "full",
    addonPerPerson,
  });

  const urgency = deriveUrgency(tour, liveDeparture);
  const totalTravelers = adults + children;
  const maxSeats = liveDeparture?.maxSeats ?? tour.maxGroupSize;
  const seatCap = liveDeparture ? Math.min(maxSeats, liveDeparture.seatsAvailable) : maxSeats;

  const addonQuery = selectedIds.size > 0 ? `&addons=${Array.from(selectedIds).join(",")}` : "";
  const checkoutHref = `/grouptours/${tour.slug}/checkout?departure=${departure}&adults=${adults}&children=${children}&singleRooms=${singleRooms}&singleOccupancy=${singleOccupancyRooms}${liveDeparture ? `&departureId=${liveDeparture.id}` : ""}${addonQuery}`;

  // Clamp private-room selections when adults changes
  const maxSingles = Math.max(0, adults - 2 * singleRooms);
  const maxCoupleRooms = Math.max(0, Math.floor((adults - singleOccupancyRooms) / 2));

  return (
    <div className="lg:sticky lg:top-[120px] space-y-4 pb-24 lg:pb-0">
      <div
        className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-6"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <UrgencyStrip signals={urgency} compact />

        <div className="mt-3 flex items-baseline gap-2 flex-wrap">
          <span className="text-[26px] font-bold text-[var(--text-primary)] tabular-nums leading-none">
            {formatPrice(pricing.basePrice + pricing.addonPerPerson)}
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
          {tour.reserveNowPayLater && <TrustItem>Reserve, pay later</TrustItem>}
          <TrustItem>Lowest price guarantee</TrustItem>
        </div>

        <hr className="my-5 border-[var(--border-default)]" />

        {(() => {
          // A city is bookable only if the addon layer covers it OR it is the
          // tour's anchor city (base ground price, no addon required).
          // Cities come straight from the tour data: anchor + addon coverage.
          // No hardcoded universe list — adding a new home city to a tour is
          // purely a DB change (insert tour_addons row + optionally set anchor).
          const codesInOrder: Array<"ISB" | "LHE" | "KHI" | "KDU"> = [];
          if (tour.anchorCity) codesInOrder.push(tour.anchorCity);
          for (const c of tour.addonCities ?? []) {
            const code = c as "ISB" | "LHE" | "KHI" | "KDU";
            if (!codesInOrder.includes(code)) codesInOrder.push(code);
          }
          const availableCities = codesInOrder.map((code) => CODE_TO_CITY[code]);
          if (availableCities.length === 0) return null;
          if (availableCities.length < 2) return null;
          return (
            <div className="mb-4">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
                Departure city
              </label>
              <div className={`grid gap-2 ${availableCities.length >= 4 ? "grid-cols-2" : availableCities.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
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
          {departuresForCity.length > 1 ? (
            <DepartureListbox
              departures={departuresForCity}
              selectedId={selectedDepartureId}
              onSelect={setSelectedDepartureId}
            />
          ) : (
            <div className="h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] flex items-center justify-between text-[13px] bg-[var(--bg-subtle)]">
              <span className="text-[var(--text-primary)] font-medium">
                {new Date((liveDeparture?.departureDate ?? tour.departureDate)).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              {liveDeparture && (
                <span className="text-[11px] font-bold text-[var(--error)]">
                  10 left
                </span>
              )}
            </div>
          )}
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
          {(tour.minAge == null || tour.minAge < 13) && (() => {
            const pct = Math.round(((tour.childDiscountPct ?? 0.5)) * 100);
            return (
              <Stepper
                label="Children"
                sub={pct > 0 ? `Ages 2–12 · ${pct}% off` : "Ages 2–12"}
                value={children}
                min={0}
                max={seatCap - adults}
                onDecrement={() => setChildren(Math.max(0, children - 1))}
                onIncrement={() => setChildren(Math.min(seatCap - adults, children + 1))}
              />
            );
          })()}
          {liveDeparture && liveDeparture.singlePrice > 0 && (
            <Stepper
              label="Single occupancy"
              sub={`+ ${formatPrice(liveDeparture.singlePrice)} · your own room`}
              value={singleOccupancyRooms}
              min={0}
              max={adults}
              onDecrement={() => setSingleOccupancyRooms(Math.max(0, singleOccupancyRooms - 1))}
              onIncrement={() => setSingleOccupancyRooms(Math.min(maxSingles, singleOccupancyRooms + 1))}
            />
          )}
          {liveDeparture && liveDeparture.twinPrice > 0 && (
            <Stepper
              label="Couple / Private room"
              sub={`+ ${formatPrice(liveDeparture.twinPrice)} / room · skip strangers`}
              value={singleRooms}
              min={0}
              max={maxCoupleRooms}
              onDecrement={() => setSingleRooms(Math.max(0, singleRooms - 1))}
              onIncrement={() => setSingleRooms(Math.min(maxCoupleRooms, singleRooms + 1))}
            />
          )}
        </div>

        {cityAddons.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[var(--border-default)]">
            <AddonPicker
              addons={cityAddons}
              selectedIds={selectedIds}
              onToggle={onToggle}
              onRadioSelect={onRadioSelect}
            />
          </div>
        )}

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
              <span>Private rooms</span>
              <span className="tabular-nums">{formatPrice(pricing.singleSupplementTotal)}</span>
            </div>
          )}
          {pricing.addonSubtotal > 0 && (
            <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)]">
              <span>Add-ons ({homeCityCode}) × {pricing.totalTravelers}</span>
              <span className="tabular-nums">{formatPrice(pricing.addonSubtotal)}</span>
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
          rel="nofollow"
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

// Custom listbox that replaces the native <select>. Native option popups
// inherit OS chrome (macOS Safari's dark-mode dropdown, Chrome's flat
// system list) and can't be styled cross-browser. This gives us a
// consistent look on light + dark themes and desktop + mobile.
function DepartureListbox({
  departures,
  selectedId,
  onSelect,
}: {
  departures: Departure[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selected = departures.find((d) => d.id === selectedId) ?? departures[0];
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full h-11 pl-4 pr-9 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] text-[13px] font-medium text-[var(--text-primary)] text-left cursor-pointer focus:outline-none focus:border-[var(--primary)]"
      >
        <span className="inline-flex items-center gap-2">
          <span>{fmt(selected.departureDate)}</span>
          <span className="text-[11px] font-bold text-[var(--error)]">10 left</span>
        </span>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-64 overflow-auto rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] py-1 shadow-lg"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          {departures.map((d) => {
            const isSelected = d.id === selected.id;
            const seatsWarn = d.seatsAvailable > 0 && d.seatsAvailable <= 6;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => { onSelect(d.id); setOpen(false); }}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left text-[13px] cursor-pointer hover:bg-[var(--bg-subtle)] ${
                    isSelected ? "font-bold text-[var(--text-primary)] bg-[var(--bg-subtle)]" : "font-medium text-[var(--text-primary)]"
                  }`}
                >
                  <span>{fmt(d.departureDate)}</span>
                  {seatsWarn && (
                    <span className="text-[11px] font-bold text-[var(--error)]">{d.seatsAvailable} left</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
