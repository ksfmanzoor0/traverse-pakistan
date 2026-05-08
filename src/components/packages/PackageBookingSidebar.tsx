"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { formatPrice, getWhatsAppUrl } from "@/lib/utils";
import { StarRating } from "@/components/ui/StarRating";
import type { Package, PackageTier } from "@/types/package";

function toIsoDate(d: Date | null) {
  if (!d) return undefined;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ─── Calendar helpers ─────────────────────────────────────────────────────── */

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}
function formatDateShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

/* ─── Calendar UI ──────────────────────────────────────────────────────────── */

interface CalendarProps {
  checkIn: Date | null;
  checkOut: Date | null;
  onSelect: (d: Date) => void;
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

function CalendarGrid({ checkIn, checkOut, onSelect, year, month, onPrev, onNext }: CalendarProps) {
  const today = startOfDay(new Date());
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDayOfWeek(year, month);

  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  function isInRange(d: Date) {
    if (!checkIn || !checkOut) return false;
    return startOfDay(d) > startOfDay(checkIn) && startOfDay(d) < startOfDay(checkOut);
  }

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={onPrev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-[var(--text-secondary)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8L10 13" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span className="text-[13px] font-bold text-[var(--text-primary)]">{MONTHS[month]} {year}</span>
        <button type="button" onClick={onNext} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-[var(--text-secondary)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3L11 8L6 13" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-[var(--text-tertiary)] py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => {
          if (!date) return <div key={`e-${idx}`} />;

          const past = startOfDay(date) < today;
          const isStart = checkIn ? isSameDay(date, checkIn) : false;
          const isEnd = checkOut ? isSameDay(date, checkOut) : false;
          const inRange = isInRange(date);
          const isToday = isSameDay(date, today);

          return (
            <div
              key={date.toISOString()}
              className={[
                "relative h-9 flex items-center justify-center",
                inRange ? "bg-[var(--primary-light)]" : "",
                isStart ? "rounded-l-full" : "",
                isEnd ? "rounded-r-full" : "",
              ].join(" ")}
            >
              <button
                type="button"
                disabled={past}
                onClick={() => !past && onSelect(date)}
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium transition-all duration-100 cursor-pointer select-none",
                  past ? "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed" : "",
                  (isStart || isEnd) ? "bg-[var(--primary)] text-[var(--text-inverse)] font-bold" : "",
                  !isStart && !isEnd && !past ? "hover:bg-[var(--primary-light)] hover:text-[var(--primary)]" : "",
                  isToday && !isStart && !isEnd ? "border border-[var(--primary)] text-[var(--primary)]" : "",
                  inRange && !isStart && !isEnd ? "text-[var(--primary)]" : "",
                ].join(" ")}
              >
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Sidebar ─────────────────────────────────────────────────────────── */

type DepartureCityOption = "islamabad" | "lahore" | "karachi";

interface PackageBookingSidebarProps {
  pkg: Package;
  selectedTier: PackageTier;
  onTierChange: (tier: PackageTier) => void;
  departureCity: DepartureCityOption;
  onDepartureCityChange: (city: DepartureCityOption) => void;
}

export function PackageBookingSidebar({ pkg, selectedTier, onTierChange, departureCity, onDepartureCityChange }: PackageBookingSidebarProps) {
  const pricing = pkg.tiers[selectedTier];

  // Calendar
  const today = new Date();
  const [calOpen, setCalOpen] = useState(false);
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [checkIn, setCheckIn] = useState<Date | null>(null);

  // Checkout auto-calculated: pkg.duration days total = duration-1 nights
  const checkOut = checkIn
    ? new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate() + pkg.duration - 1)
    : null;

  // Rooms & travelers
  const [rooms, setRooms] = useState(1);
  const [adults, setAdults] = useState(2);

  const calWrapRef = useRef<HTMLDivElement>(null);

  // Pre-fill from search widget session
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tp_search");
      if (!raw) return;
      const s = JSON.parse(raw) as {
        startDate?: string;
        travelers?: { adults: number; children: number; infants: number };
      };
      if (s.startDate) {
        const d = new Date(s.startDate);
        setCheckIn(d);
        setCalYear(d.getFullYear());
        setCalMonth(d.getMonth());
      }
      if (s.travelers) {
        const total = Math.max(1, s.travelers.adults + s.travelers.children);
        setAdults(Math.min(total, pkg.maxGroupSize));
      }
    } catch { /* ignore */ }
  }, [pkg.maxGroupSize]);

  useEffect(() => {
    if (!calOpen) return;
    function handleOutside(e: MouseEvent) {
      if (calWrapRef.current && !calWrapRef.current.contains(e.target as Node)) {
        setCalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [calOpen]);

  function handleDateSelect(date: Date) {
    setCheckIn(date);
    setCalOpen(false);
  }

  function clearDate() {
    setCheckIn(null);
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  // Price — 3 persons per room max; extra rooms beyond default incur single supplement
  const nights = pkg.duration - 1;
  const defaultRooms = Math.ceil(adults / 3);
  const extraRooms = Math.max(0, rooms - defaultRooms);
  const singleSupp = pricing.singleSupplement ?? 0;
  const pricePerPerson =
    (departureCity === "lahore" && pricing.lahore) ? pricing.lahore :
    (departureCity === "karachi" && pricing.karachi) ? pricing.karachi :
    (pricing.islamabad ?? pricing.lahore ?? pricing.karachi ?? 0);
  const baseTotal = pricePerPerson * adults;
  const roomSurcharge = extraRooms * singleSupp;
  const totalPrice = baseTotal + roomSurcharge;

  const dateLabel = checkIn && checkOut
    ? `${formatDateShort(checkIn)} → ${formatDateShort(checkOut)}`
    : "Select start date";

  const whatsappMessage =
    `Hi! I'd like to book the "${pkg.name}" package.\n\n` +
    `Departure: ${departureCity === "lahore" ? "Lahore" : "Islamabad"}\n` +
    `Tier: ${selectedTier === "deluxe" ? "Deluxe" : "Luxury"}\n` +
    (checkIn && checkOut ? `Dates: ${formatDateShort(checkIn)} – ${formatDateShort(checkOut)} (${nights} nights)\n` : "") +
    `Adults: ${adults}\nRooms: ${rooms}\nTotal: ${formatPrice(totalPrice)}\n\nPlease confirm availability.`;

  return (
    <div className="sticky top-[120px]">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-6" style={{ boxShadow: "var(--shadow-sm)" }}>

        {/* Tier */}
        <div className="mb-5">
          <label className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] block mb-2">Choose Your Tier</label>
          <div className="grid grid-cols-2 gap-2">
            {(["deluxe", "luxury"] as PackageTier[]).map((tier) => (
              <button key={tier} type="button" onClick={() => onTierChange(tier)}
                className={`h-11 rounded-[var(--radius-sm)] text-[13px] font-semibold border transition-colors cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  selectedTier === tier
                    ? "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary)]"
                    : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--primary)]"
                }`}
              >
                {tier === "luxury" && <span className="text-[9px] uppercase tracking-widest opacity-70">✦</span>}
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Departure City */}
        {(pricing.lahore !== null || pricing.karachi !== null) && (
          <div className="mb-5">
            <label className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] block mb-2">Starting Location</label>
            <div className={`grid gap-2 ${pricing.karachi ? "grid-cols-3" : "grid-cols-2"}`}>
              {(["islamabad", "lahore", "karachi"] as DepartureCityOption[])
                .filter((city) => pricing[city] !== null)
                .map((city) => (
                  <button key={city} type="button" onClick={() => onDepartureCityChange(city)}
                    className={`h-11 rounded-[var(--radius-sm)] text-[13px] font-semibold border transition-colors cursor-pointer capitalize ${
                      departureCity === city
                        ? "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary)]"
                        : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)] hover:border-[var(--primary)]"
                    }`}
                  >
                    {city.charAt(0).toUpperCase() + city.slice(1)}
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Price display */}
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatPrice(totalPrice)}</span>
          <span className="text-[14px] text-[var(--text-tertiary)]">total</span>
        </div>
        <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
          {formatPrice(pricePerPerson)} × {adults} person{adults > 1 ? "s" : ""}
          {roomSurcharge > 0 && ` + ${formatPrice(roomSurcharge)} room supplement`}
        </p>


        {/* Rating */}
        <div className="mt-2">
          <StarRating rating={pkg.rating} reviewCount={pkg.reviewCount} size="sm" />
        </div>

        <hr className="my-5 border-[var(--border-default)]" />

        {/* Date picker */}
        <div className="mb-3" ref={calWrapRef}>
          <label className="text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] block mb-2">
            Start Date
          </label>
          <button
            type="button"
            onClick={() => setCalOpen(o => !o)}
            className={`w-full h-11 px-4 border rounded-[var(--radius-sm)] flex items-center justify-between text-[13px] transition-colors cursor-pointer ${
              calOpen
                ? "border-[var(--primary)] ring-2 ring-[var(--primary-light)] bg-[var(--bg-primary)]"
                : "border-[var(--border-default)] bg-[var(--bg-subtle)] hover:border-[var(--primary)]"
            }`}
          >
            <span className={checkIn ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]"}>
              {dateLabel}
            </span>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--primary)] shrink-0">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </button>

          {checkIn && checkOut && (
            <p className="mt-1.5 text-[12px] text-[var(--text-tertiary)]">
              {nights} nights · ends {formatDateShort(checkOut)}
            </p>
          )}

          {calOpen && (
            <div className="mt-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-4" style={{ boxShadow: "var(--shadow-md)" }}>
              <p className="text-[11px] text-[var(--text-tertiary)] text-center mb-3">
                Select your start date — checkout set automatically
              </p>
              <CalendarGrid
                checkIn={checkIn} checkOut={checkOut}
                onSelect={handleDateSelect}
                year={calYear} month={calMonth} onPrev={prevMonth} onNext={nextMonth}
              />
              {checkIn && (
                <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex items-center justify-between">
                  <button type="button" onClick={clearDate} className="text-[12px] text-[var(--text-tertiary)] underline cursor-pointer hover:text-[var(--text-primary)] transition-colors">
                    Clear date
                  </button>
                  <span className="text-[12px] font-semibold text-[var(--primary)]">{nights} night{nights !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rooms & Adults */}
        <div className="mb-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] overflow-hidden">
          {/* Rooms row */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-subtle)]">
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">Rooms</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {rooms > defaultRooms
                  ? `+${formatPrice(roomSurcharge)} supplement`
                  : "Up to 3 per room — no extra charge"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setRooms(r => Math.max(1, r - 1))} disabled={rooms <= 1}
                className="w-8 h-8 border border-[var(--border-default)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer disabled:opacity-30 bg-[var(--bg-primary)]">
                −
              </button>
              <span className="w-4 text-center text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">{rooms}</span>
              <button type="button" onClick={() => setRooms(r => Math.min(adults, r + 1))} disabled={rooms >= adults}
                className="w-8 h-8 border border-[var(--border-default)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer disabled:opacity-30 bg-[var(--bg-primary)]">
                +
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[var(--border-default)]" />

          {/* Adults row */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-subtle)]">
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">Adults</p>
              <p className="text-[11px] text-[var(--text-tertiary)]">{formatPrice(pricePerPerson)} / person</p>
            </div>
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => {
                  const next = Math.max(1, adults - 1);
                  setAdults(next);
                  setRooms(r => Math.min(r, Math.ceil(next / 3)));
                }}
                disabled={adults <= 1}
                className="w-8 h-8 border border-[var(--border-default)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer disabled:opacity-30 bg-[var(--bg-primary)]">
                −
              </button>
              <span className="w-4 text-center text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">{adults}</span>
              <button type="button"
                onClick={() => {
                  const next = Math.min(pkg.maxGroupSize, adults + 1);
                  setAdults(next);
                  setRooms(r => Math.max(r, Math.ceil(next / 3)));
                }}
                disabled={adults >= pkg.maxGroupSize}
                className="w-8 h-8 border border-[var(--border-default)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer disabled:opacity-30 bg-[var(--bg-primary)]">
                +
              </button>
            </div>
          </div>
        </div>

        {/* Price breakdown */}
        <div className="mb-4 space-y-1.5">
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-secondary)]">{formatPrice(pricePerPerson)} × {adults} person{adults > 1 ? "s" : ""}</span>
            <span className="text-[var(--text-primary)] font-medium tabular-nums">{formatPrice(baseTotal)}</span>
          </div>
          {roomSurcharge > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-secondary)]">{extraRooms} extra room{extraRooms > 1 ? "s" : ""} supplement</span>
              <span className="text-[var(--text-primary)] font-medium tabular-nums">+{formatPrice(roomSurcharge)}</span>
            </div>
          )}
          <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-[var(--border-default)]">
            <span className="text-[var(--text-primary)]">Total</span>
            <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/packages/${pkg.slug}/checkout`}
          className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-semibold rounded-[var(--radius-sm)] flex items-center justify-center gap-2 hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all"
        >
          Book Now
        </Link>
        <a
          href={getWhatsAppUrl(whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 w-full h-10 flex items-center justify-center gap-2 text-[13px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          or ask on WhatsApp →
        </a>

        {/* Guarantees */}
        <div className="mt-5 space-y-2">
          {pkg.freeCancellation && (
            <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Free cancellation
            </p>
          )}
          {pkg.reserveNowPayLater && (
            <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
              Reserve now, pay later
            </p>
          )}
          <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Lowest price guarantee
          </p>
        </div>
      </div>
    </div>
  );
}
