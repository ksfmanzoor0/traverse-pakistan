"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { applyHotelMargin, CHILD_MIN_AGE, CHILD_MAX_AGE } from "@/lib/constants";
import { useHotelRoom } from "@/components/hotels/HotelRoomContext";
import type { Hotel, HotelRoom, HotelSeasonDefinition } from "@/types/hotel";

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

function getSeasonLabel(date: Date, seasons: HotelSeasonDefinition[]): string | null {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mmdd = `${mm}-${dd}`;
  for (const season of seasons) {
    for (const period of season.periods) {
      if (period.from > period.to) {
        if (mmdd >= period.from || mmdd <= period.to) return season.label;
      } else {
        if (mmdd >= period.from && mmdd <= period.to) return season.label;
      }
    }
  }
  return null;
}

function getRoomPrice(room: HotelRoom, seasonLabel: string | null): number {
  if (room.prices && seasonLabel) {
    const match = room.prices.find((p) => p.season === seasonLabel);
    if (match) return match.price;
  }
  return room.price;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isBefore(a: Date, b: Date) { return startOfDay(a) < startOfDay(b); }
function diffDays(a: Date, b: Date) { return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000); }
function fmt(d: Date) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDOW(y: number, m: number) { return new Date(y, m, 1).getDay(); }

/* ─── Calendar ──────────────────────────────────────────────────────────────── */

type Selecting = "checkin" | "checkout";

interface CalendarProps {
  checkIn: Date | null; checkOut: Date | null; hovered: Date | null;
  selecting: Selecting; onHover: (d: Date | null) => void; onSelect: (d: Date) => void;
  year: number; month: number; onPrev: () => void; onNext: () => void;
}

function CalendarGrid({ checkIn, checkOut, hovered, selecting, onHover, onSelect, year, month, onPrev, onNext }: CalendarProps) {
  const today = startOfDay(new Date());
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDOW(year, month);
  const cells: (Date | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))];
  const rangeEnd = selecting === "checkout" ? (checkOut ?? hovered) : checkOut;

  function isInRange(d: Date) {
    if (!checkIn || !rangeEnd) return false;
    const lo = isBefore(checkIn, rangeEnd) ? checkIn : rangeEnd;
    const hi = isBefore(checkIn, rangeEnd) ? rangeEnd : checkIn;
    return startOfDay(d) > startOfDay(lo) && startOfDay(d) < startOfDay(hi);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 px-1">
        <button type="button" onClick={onPrev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-[var(--text-secondary)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8L10 13" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span className="text-[13px] font-bold text-[var(--text-primary)]">{MONTHS[month]} {year}</span>
        <button type="button" onClick={onNext} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-[var(--text-secondary)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3L11 8L6 13" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => <div key={d} className="text-center text-[11px] font-semibold text-[var(--text-tertiary)] py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => {
          if (!date) return <div key={`e-${idx}`} />;
          const past = startOfDay(date) < today;
          const isCI = checkIn ? isSameDay(date, checkIn) : false;
          const isCO = checkOut ? isSameDay(date, checkOut) : false;
          const inRange = isInRange(date);
          const isToday = isSameDay(date, today);
          const rangeStart = checkIn && rangeEnd && isSameDay(date, isBefore(checkIn, rangeEnd) ? checkIn : rangeEnd);
          const rangeEndDay = checkIn && rangeEnd && !isSameDay(checkIn, rangeEnd) && isSameDay(date, isBefore(checkIn, rangeEnd) ? rangeEnd : checkIn);
          return (
            <div key={date.toISOString()} className={["relative h-9 flex items-center justify-center", inRange ? "bg-[var(--primary-light)]" : "", rangeStart && rangeEnd && !isSameDay(checkIn!, rangeEnd) ? "rounded-l-full" : "", rangeEndDay ? "rounded-r-full" : ""].join(" ")}>
              <button type="button" disabled={past} onClick={() => !past && onSelect(date)} onMouseEnter={() => !past && onHover(date)} onMouseLeave={() => onHover(null)}
                className={["w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium transition-all duration-100 cursor-pointer select-none",
                  past ? "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed" : "",
                  (isCI || isCO) ? "bg-[var(--primary)] text-[var(--text-inverse)] font-bold shadow-sm" : "",
                  !isCI && !isCO && !past ? "hover:bg-[var(--primary-light)] hover:text-[var(--primary)]" : "",
                  isToday && !isCI && !isCO ? "border border-[var(--primary)] text-[var(--primary)]" : "",
                  inRange && !isCI && !isCO ? "text-[var(--primary)] font-semibold" : "",
                ].join(" ")}>
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main sidebar ──────────────────────────────────────────────────────────── */

export function HotelBookingSidebar({ hotel }: { hotel: Hotel }) {
  const today = new Date();
  const { selections, hasSelections, totalRooms, totalAdults, totalChildren, hasInfant, setQty, checkIn, checkOut, setCheckIn, setCheckOut } = useHotelRoom();

  // Calendar
  const [calOpen, setCalOpen] = useState(false);
  const [selecting, setSelecting] = useState<Selecting>("checkin");
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [hovered, setHovered] = useState<Date | null>(null);

  const calRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tp_search");
      if (!raw) return;
      const s = JSON.parse(raw) as { startDate?: string; endDate?: string };
      if (s.startDate) { const d = new Date(s.startDate); setCheckIn(d); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }
      if (s.endDate) setCheckOut(new Date(s.endDate) );
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function openFor(s: Selecting) { setSelecting(s); setCalOpen(true); }

  function handleDateSelect(date: Date) {
    if (selecting === "checkin") {
      setCheckIn(date); setCheckOut(null); setSelecting("checkout");
    } else {
      if (!checkIn || isBefore(date, checkIn) || isSameDay(date, checkIn)) {
        setCheckIn(date); setCheckOut(null); setSelecting("checkout");
      } else {
        setCheckOut(date); setCalOpen(false);
      }
    }
  }

  function prevMonth() { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }
  function nextMonth() { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }

  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;
  const seasonLabel = hotel.seasons && checkIn ? getSeasonLabel(checkIn, hotel.seasons) : null;

  // Per-room line items
  const lineItems = [...selections.values()].map((sel) => {
    const pricePerNight = getRoomPrice(sel.room, seasonLabel);
    const extraPeople = Math.max(0, sel.adults + sel.children - 2 * sel.qty);
    const extraRate = sel.room.extraOccupancyCharge ?? 0;
    const roomTotal = pricePerNight * sel.qty * (nights || 1);
    const extraTotal = extraRate * extraPeople * (nights || 1);
    return { sel, pricePerNight, extraPeople, extraRate, roomTotal, extraTotal };
  });

  const perNightTotal = lineItems.reduce((s, li) => s + li.pricePerNight * li.sel.qty, 0);
  const grandTotal = lineItems.reduce((s, li) => s + li.roomTotal + li.extraTotal, 0);

  // Starting price shown in header
  const minRoomPrice = hotel.rooms.length > 0 ? Math.min(...hotel.rooms.map((r) => r.price)) : 0;

  // Checkout URL — encode each selection as roomName|qty|adults|children
  const selectionParams = [...selections.values()]
    .map((sel) => `r=${encodeURIComponent(`${sel.room.name}|${sel.qty}|${sel.adults}|${sel.children}`)}`)
    .join("&");

  const checkoutHref = checkIn && checkOut && hasSelections
    ? `/hotels/${hotel.slug}/checkout?checkin=${checkIn.toISOString().split("T")[0]}&checkout=${checkOut.toISOString().split("T")[0]}&${selectionParams}${hasInfant ? "&infant=1" : ""}`
    : null;

  // WhatsApp message
  const roomLines = [...selections.values()]
    .map((sel) => `  • ${sel.room.name} × ${sel.qty} (${sel.adults} adult${sel.adults !== 1 ? "s" : ""}${sel.children > 0 ? `, ${sel.children} child${sel.children !== 1 ? "ren" : ""}` : ""})`)
    .join("\n");

  const whatsappMsg =
    `Hi! I'd like to book at ${hotel.name}.\n\nRooms:\n${roomLines}\n` +
    (checkIn && checkOut ? `Dates: ${fmt(checkIn)} – ${fmt(checkOut)} (${nights} night${nights !== 1 ? "s" : ""})\n` : "") +
    (hasInfant ? "Travelling with an infant\n" : "") +
    (grandTotal > 0 ? `\nEst. total: ${formatPrice(grandTotal)}\n` : "") +
    "\nPlease confirm availability.";

  const ciLabel = checkIn ? fmt(checkIn) : "Add date";
  const coLabel = checkOut ? fmt(checkOut) : "Add date";

  return (
    <div className="sticky top-[120px]">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-6" style={{ boxShadow: "var(--shadow-sm)" }}>

        {/* Price header */}
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <span className="text-[12px] text-[var(--text-tertiary)]">from </span>
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatPrice(minRoomPrice)}</span>
            <span className="text-[14px] text-[var(--text-tertiary)]"> / night</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="star" size="sm" weight="fill" color="var(--primary-muted)" />
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{hotel.rating}</span>
            <span className="text-[12px] text-[var(--text-tertiary)]">({hotel.reviewCount})</span>
          </div>
        </div>

        {/* Date picker */}
        <div className="mb-4" ref={calRef}>
          <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] block mb-2">Dates</label>
          <div className="border border-[var(--border-default)] rounded-[var(--radius-sm)] overflow-hidden">
            <div className="grid grid-cols-2">
              <button type="button" onClick={() => openFor("checkin")}
                className={`p-3 text-left border-r border-[var(--border-default)] transition-colors cursor-pointer ${calOpen && selecting === "checkin" ? "bg-[var(--primary-light)] border-b-2 border-b-[var(--primary)]" : "hover:bg-[var(--bg-subtle)]"}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Check-in</p>
                <p className={`text-[13px] mt-0.5 font-medium ${checkIn ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>{ciLabel}</p>
              </button>
              <button type="button" onClick={() => openFor("checkout")}
                className={`p-3 text-left transition-colors cursor-pointer ${calOpen && selecting === "checkout" ? "bg-[var(--primary-light)] border-b-2 border-b-[var(--primary)]" : "hover:bg-[var(--bg-subtle)]"}`}>
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Check-out</p>
                <p className={`text-[13px] mt-0.5 font-medium ${checkOut ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>{coLabel}</p>
              </button>
            </div>
          </div>
          {calOpen && (
            <div className="mt-1 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-4 z-50 relative" style={{ boxShadow: "var(--shadow-md)" }}>
              <p className="text-[11px] text-center text-[var(--text-tertiary)] mb-3 font-medium">
                {selecting === "checkin" ? "Select check-in date" : "Select check-out date"}
              </p>
              <CalendarGrid checkIn={checkIn} checkOut={checkOut} hovered={hovered} selecting={selecting}
                onHover={setHovered} onSelect={handleDateSelect}
                year={calYear} month={calMonth} onPrev={prevMonth} onNext={nextMonth} />
              <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex items-center justify-between">
                <button type="button" onClick={() => { setCheckIn(null); setCheckOut(null); setSelecting("checkin");  }}
                  className="text-[12px] text-[var(--text-tertiary)] underline cursor-pointer hover:text-[var(--text-primary)] transition-colors">
                  Clear dates
                </button>
                {nights > 0 && <span className="text-[12px] font-semibold text-[var(--primary)]">{nights} night{nights !== 1 ? "s" : ""}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Selection summary — removable room cards */}
        {hasSelections && (
          <div className="mt-2 mb-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-2">
              {totalRooms} room{totalRooms !== 1 ? "s" : ""} · {totalAdults} adult{totalAdults !== 1 ? "s" : ""}{totalChildren > 0 ? ` · ${totalChildren} child${totalChildren !== 1 ? "ren" : ""}` : ""}
            </p>
            <div className="space-y-1.5">
              {lineItems.map(({ sel, pricePerNight }) => (
                <div key={sel.room.name} className="flex items-center justify-between gap-2 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-subtle)]">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-[var(--text-primary)] leading-snug">
                      {sel.room.name} <span className="font-normal text-[var(--text-tertiary)]">×{sel.qty}</span>
                    </p>
                    <p className="text-[11px] text-[var(--text-tertiary)]">
                      {sel.adults} adult{sel.adults !== 1 ? "s" : ""}{sel.children > 0 ? ` · ${sel.children} child${sel.children !== 1 ? "ren" : ""}` : ""}
                    </p>
                  </div>
                  <p className="text-[12px] font-bold text-[var(--text-primary)] tabular-nums shrink-0">
                    {formatPrice(pricePerNight * sel.qty)}<span className="text-[10px] font-normal text-[var(--text-tertiary)]">/night</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setQty(sel.room, 0)}
                    aria-label={`Remove ${sel.room.name}`}
                    className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--error)] transition-colors cursor-pointer shrink-0"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                      <line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Price breakdown */}
        {hasSelections && (
          <div className="mb-4 space-y-2 pt-4 border-t border-[var(--border-default)]">
            {lineItems.map(({ sel, pricePerNight, extraPeople, extraRate, roomTotal, extraTotal }) => (
              <div key={sel.room.name}>
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--text-secondary)]">
                    {sel.room.name} ×{sel.qty} × {nights || 1} night{(nights || 1) !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[var(--text-primary)] font-medium tabular-nums">{formatPrice(pricePerNight * sel.qty * (nights || 1))}</span>
                </div>
                {extraPeople > 0 && extraRate > 0 && (
                  <div className="flex justify-between text-[12px] mt-0.5">
                    <span className="text-[var(--text-tertiary)]">
                      Extra occupancy ({extraPeople} guest{extraPeople > 1 ? "s" : ""}) × {nights || 1} night{(nights || 1) !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(extraTotal)}</span>
                  </div>
                )}
                {roomTotal + extraTotal !== pricePerNight * sel.qty * (nights || 1) + extraTotal && null}
              </div>
            ))}
            {nights > 0 && (
              <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-[var(--border-default)]">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(grandTotal)}</span>
              </div>
            )}
            {!nights && hasSelections && (
              <div className="flex justify-between text-[13px] font-semibold pt-2 border-t border-[var(--border-default)]">
                <span className="text-[var(--text-secondary)]">Per night</span>
                <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(perNightTotal)}</span>
              </div>
            )}
          </div>
        )}

        {/* CTA */}
        {checkoutHref ? (
          <Link href={checkoutHref}
            className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-semibold rounded-[var(--radius-sm)] flex items-center justify-center gap-2 hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all">
            Book Now
          </Link>
        ) : (
          <button type="button"
            onClick={() => !hasSelections ? document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth" }) : openFor("checkin")}
            className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-semibold rounded-[var(--radius-sm)] flex items-center justify-center gap-2 hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all cursor-pointer">
            {!hasSelections ? "Select rooms below" : checkIn ? "Select check-out date" : "Select dates to book"}
          </button>
        )}
        <p className="text-center text-[12px] text-[var(--text-tertiary)] mt-2">You won&apos;t be charged yet</p>

        {/* WhatsApp fallback */}
        {hasSelections && (
          <a href={`https://wa.me/923216650670?text=${encodeURIComponent(whatsappMsg)}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-3 w-full h-10 border border-[var(--border-default)] rounded-[var(--radius-sm)] flex items-center justify-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
            <Icon name="whatsapp" size="sm" color="currentColor" />
            Enquire on WhatsApp
          </a>
        )}

        {/* Guarantees */}
        <div className="mt-4 space-y-2 pt-4 border-t border-[var(--border-default)]">
          <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            Free cancellation before check-in
          </p>
          <p className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
            24/7 WhatsApp support
          </p>
        </div>
      </div>
    </div>
  );
}
