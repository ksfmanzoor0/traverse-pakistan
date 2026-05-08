"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { applyHotelMargin, CHILD_MIN_AGE, CHILD_MAX_AGE, DEFAULT_ROOM_CAPACITY } from "@/lib/constants";
import { useHotelRoom } from "@/components/hotels/HotelRoomContext";
import type { Hotel, HotelRoom, HotelSeasonDefinition } from "@/types/hotel";

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

/** Returns the matching season label for a given date, or null for legacy hotels. */
function getSeasonLabel(date: Date, seasons: HotelSeasonDefinition[]): string | null {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mmdd = `${mm}-${dd}`;
  for (const season of seasons) {
    for (const period of season.periods) {
      if (period.from > period.to) {
        // Wraps year boundary (e.g. "11-16" → "03-14")
        if (mmdd >= period.from || mmdd <= period.to) return season.label;
      } else {
        if (mmdd >= period.from && mmdd <= period.to) return season.label;
      }
    }
  }
  return null;
}

/**
 * Returns the display price for a room given the active season.
 * prices[] stores BASE prices — applyHotelMargin is applied here.
 * Falls back to room.price (already display price) for legacy hotels.
 */
function getRoomPrice(room: HotelRoom, seasonLabel: string | null): number {
  if (room.prices && seasonLabel) {
    const match = room.prices.find((p) => p.season === seasonLabel);
    if (match) return applyHotelMargin(match.price);
  }
  return room.price;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isBefore(a: Date, b: Date) {
  return startOfDay(a) < startOfDay(b);
}
function diffDays(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}
function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDOW(y: number, m: number) { return new Date(y, m, 1).getDay(); }

/* ─── Calendar ──────────────────────────────────────────────────────────────── */

type Selecting = "checkin" | "checkout";

interface CalendarProps {
  checkIn: Date | null;
  checkOut: Date | null;
  hovered: Date | null;
  selecting: Selecting;
  onHover: (d: Date | null) => void;
  onSelect: (d: Date) => void;
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

function CalendarGrid({ checkIn, checkOut, hovered, selecting, onHover, onSelect, year, month, onPrev, onNext }: CalendarProps) {
  const today = startOfDay(new Date());
  const daysInMonth = getDaysInMonth(year, month);
  const firstDow = getFirstDOW(year, month);

  const cells: (Date | null)[] = [
    ...Array(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const rangeEnd = selecting === "checkout" ? (checkOut ?? hovered) : checkOut;

  function isInRange(d: Date) {
    if (!checkIn || !rangeEnd) return false;
    const lo = isBefore(checkIn, rangeEnd) ? checkIn : rangeEnd;
    const hi = isBefore(checkIn, rangeEnd) ? rangeEnd : checkIn;
    return startOfDay(d) > startOfDay(lo) && startOfDay(d) < startOfDay(hi);
  }

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button type="button" onClick={onPrev}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-[var(--text-secondary)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8L10 13" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <span className="text-[13px] font-bold text-[var(--text-primary)]">{MONTHS[month]} {year}</span>
        <button type="button" onClick={onNext}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer text-[var(--text-secondary)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3L11 8L6 13" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-[var(--text-tertiary)] py-1">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => {
          if (!date) return <div key={`e-${idx}`} />;

          const past = startOfDay(date) < today;
          const isCI = checkIn ? isSameDay(date, checkIn) : false;
          const isCO = checkOut ? isSameDay(date, checkOut) : false;
          const inRange = isInRange(date);
          const isToday = isSameDay(date, today);

          const rangeStart = checkIn && rangeEnd && isSameDay(date,
            isBefore(checkIn, rangeEnd) ? checkIn : rangeEnd);
          const rangeEndDay = checkIn && rangeEnd && !isSameDay(checkIn, rangeEnd) && isSameDay(date,
            isBefore(checkIn, rangeEnd) ? rangeEnd : checkIn);

          return (
            <div
              key={date.toISOString()}
              className={[
                "relative h-9 flex items-center justify-center",
                inRange ? "bg-[var(--primary-light)]" : "",
                rangeStart && rangeEnd && !isSameDay(checkIn!, rangeEnd) ? "rounded-l-full" : "",
                rangeEndDay ? "rounded-r-full" : "",
              ].join(" ")}
            >
              <button
                type="button"
                disabled={past}
                onClick={() => !past && onSelect(date)}
                onMouseEnter={() => !past && onHover(date)}
                onMouseLeave={() => onHover(null)}
                className={[
                  "w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium transition-all duration-100 cursor-pointer select-none",
                  past ? "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed" : "",
                  (isCI || isCO) ? "bg-[var(--primary)] text-[var(--text-inverse)] font-bold shadow-sm" : "",
                  !isCI && !isCO && !past ? "hover:bg-[var(--primary-light)] hover:text-[var(--primary)]" : "",
                  isToday && !isCI && !isCO ? "border border-[var(--primary)] text-[var(--primary)]" : "",
                  inRange && !isCI && !isCO ? "text-[var(--primary)] font-semibold" : "",
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

/* ─── Counter ───────────────────────────────────────────────────────────────── */

function Counter({ label, sub, value, onDec, onInc, disableDec, disableInc }: {
  label: string; sub: string; value: number;
  onDec: () => void; onInc: () => void;
  disableDec: boolean; disableInc: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-[13px] font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">{sub}</p>
      </div>
      <div className="flex items-center gap-3">
        <button type="button" onClick={onDec} disabled={disableDec}
          className="w-8 h-8 border border-[var(--border-default)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer disabled:opacity-30 bg-[var(--bg-primary)] text-lg leading-none">
          −
        </button>
        <span className="w-5 text-center text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">{value}</span>
        <button type="button" onClick={onInc} disabled={disableInc}
          className="w-8 h-8 border border-[var(--border-default)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer disabled:opacity-30 bg-[var(--bg-primary)] text-lg leading-none">
          +
        </button>
      </div>
    </div>
  );
}

/* ─── Main sidebar ──────────────────────────────────────────────────────────── */

interface HotelBookingSidebarProps {
  hotel: Hotel;
}

const MAX_ROOMS = 10;

/** Extracts just the bed type from the beds string (strips amenity descriptors after ·). */
function bedType(beds: string): string {
  return beds.split("·")[0].trim();
}

/** Returns the resolved capacity for a room, falling back to DEFAULT_ROOM_CAPACITY. */
function getCapacity(room: HotelRoom) {
  return room.capacity ?? DEFAULT_ROOM_CAPACITY;
}

/**
 * Total bed slots per room (adults + children share beds).
 * Uses explicit maxOccupancy if set, otherwise sum of adults + children limits.
 */
function maxOccupancyPerRoom(room: HotelRoom): number {
  const cap = getCapacity(room);
  return cap.maxOccupancy ?? (cap.adults + cap.children);
}

/** Rooms needed for a given headcount at this room's max occupancy. */
function requiredRooms(adults: number, children: number, room: HotelRoom): number {
  return Math.max(1, Math.ceil((adults + children) / maxOccupancyPerRoom(room)));
}

export function HotelBookingSidebar({ hotel }: HotelBookingSidebarProps) {
  const today = new Date();

  // Calendar
  const [calOpen, setCalOpen] = useState(false);
  const [selecting, setSelecting] = useState<Selecting>("checkin");
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);

  // Room — shared with the "Where you'll sleep" section via context
  const { selectedRoom, setSelectedRoom } = useHotelRoom();
  const [numRooms, setNumRooms] = useState(1);

  // Guests
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infantCrib, setInfantCrib] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const occupancy = maxOccupancyPerRoom(selectedRoom);

  const calRef = useRef<HTMLDivElement>(null);
  const guestsRef = useRef<HTMLDivElement>(null);

  // Pre-fill from search widget session
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tp_search");
      if (!raw) return;
      const s = JSON.parse(raw) as {
        startDate?: string;
        endDate?: string;
        travelers?: { adults: number; children: number; infants?: number };
      };
      if (s.startDate) {
        const d = new Date(s.startDate);
        setCheckIn(d);
        setCalYear(d.getFullYear());
        setCalMonth(d.getMonth());
      }
      if (s.endDate) setCheckOut(new Date(s.endDate));
      if (s.travelers) {
        setAdults(Math.max(1, s.travelers.adults));
        setChildren(s.travelers.children);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false);
      if (guestsRef.current && !guestsRef.current.contains(e.target as Node)) setGuestsOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function openFor(s: Selecting) {
    setSelecting(s);
    setCalOpen(true);
  }

  function handleDateSelect(date: Date) {
    if (selecting === "checkin") {
      setCheckIn(date);
      setCheckOut(null);
      setSelecting("checkout");
      // stay open for checkout
    } else {
      if (!checkIn || isBefore(date, checkIn) || isSameDay(date, checkIn)) {
        // Picked before/same as check-in → restart
        setCheckIn(date);
        setCheckOut(null);
        setSelecting("checkout");
      } else {
        setCheckOut(date);
        setCalOpen(false);
        setGuestsOpen(true);
      }
    }
  }

  function clearDates() {
    setCheckIn(null);
    setCheckOut(null);
    setSelecting("checkin");
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  }

  // Seasonal pricing
  const seasonLabel = (hotel.seasons && checkIn) ? getSeasonLabel(checkIn, hotel.seasons) : null;
  const activeRoomPrice = getRoomPrice(selectedRoom, seasonLabel);

  // Pricing
  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;
  const nightlyTotal = activeRoomPrice * numRooms;
  const extraPeople = Math.max(0, adults + children - 2 * numRooms);
  const extraOccupancyRate = selectedRoom.extraOccupancyCharge ?? 0;
  const extraOccupancyTotal = extraOccupancyRate * extraPeople * (nights || 1);
  const subtotal = nightlyTotal * (nights || 1) + extraOccupancyTotal;

  const ciLabel = checkIn ? fmt(checkIn) : "Add date";
  const coLabel = checkOut ? fmt(checkOut) : "Add date";

  const whatsappMsg =
    `Hi! I'd like to book at ${hotel.name}.\n\n` +
    `Room: ${selectedRoom.name} × ${numRooms}\n` +
    (checkIn && checkOut ? `Dates: ${fmt(checkIn)} – ${fmt(checkOut)} (${nights} night${nights !== 1 ? "s" : ""})\n` : "") +
    `Adults: ${adults}` +
    (children > 0 ? `\nChildren (${CHILD_MIN_AGE}–${CHILD_MAX_AGE}): ${children}` : "") +
    (infantCrib ? `\nTravelling with an infant` : "") +
    `\nEst. total: ${formatPrice(subtotal)}\n\nPlease confirm availability.`;

  return (
    <div className="sticky top-[120px]">
      <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-6" style={{ boxShadow: "var(--shadow-sm)" }}>

        {/* Price header */}
        <div className="flex items-baseline justify-between mb-5">
          <div>
            <span className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{formatPrice(activeRoomPrice)}</span>
            <span className="text-[14px] text-[var(--text-tertiary)]"> / night</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Icon name="star" size="sm" weight="fill" color="var(--primary-muted)" />
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{hotel.rating}</span>
            <span className="text-[12px] text-[var(--text-tertiary)]">({hotel.reviewCount})</span>
          </div>
        </div>

        {/* Room selector */}
        <div className="mb-4">
          <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] block mb-2">Room Type</label>
          <div className="space-y-2">
            {hotel.rooms.map((room) => (
              <button
                key={room.name}
                type="button"
                onClick={() => { setSelectedRoom(room); setNumRooms(r => Math.max(requiredRooms(adults, children, room), r)); }}
                className={`w-full text-left px-3 py-2.5 border rounded-[var(--radius-sm)] transition-colors cursor-pointer ${
                  selectedRoom.name === room.name
                    ? "border-[var(--primary)] bg-[var(--primary-light)]"
                    : "border-[var(--border-default)] hover:border-[var(--primary)] bg-[var(--bg-subtle)]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold text-[var(--text-primary)]">{room.name}</p>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                      {bedType(room.beds)}
                      {room.capacity && (
                        <>
                          {" · "}
                          {room.capacity.adults} adult{room.capacity.adults !== 1 ? "s" : ""}
                          {room.capacity.children > 0 && ` · ${room.capacity.children} child${room.capacity.children !== 1 ? "ren" : ""}`}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-[13px] font-bold text-[var(--text-primary)] tabular-nums">{formatPrice(getRoomPrice(room, seasonLabel))}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)]">/ night</p>
                  </div>
                </div>
                {room.available <= 2 && (
                  <p className="text-[10px] font-semibold text-[var(--warning)] mt-1">Only {room.available} left!</p>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Airbnb-style date grid */}
        <div className="mb-3" ref={calRef}>
          <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] block mb-2">Dates</label>
          <div className="border border-[var(--border-default)] rounded-[var(--radius-sm)] overflow-hidden">
            <div className="grid grid-cols-2">
              {/* Check-in */}
              <button
                type="button"
                onClick={() => openFor("checkin")}
                className={`p-3 text-left border-r border-[var(--border-default)] transition-colors cursor-pointer ${
                  calOpen && selecting === "checkin"
                    ? "bg-[var(--primary-light)] border-b-2 border-b-[var(--primary)]"
                    : "hover:bg-[var(--bg-subtle)]"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Check-in</p>
                <p className={`text-[13px] mt-0.5 font-medium ${checkIn ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                  {ciLabel}
                </p>
              </button>
              {/* Check-out */}
              <button
                type="button"
                onClick={() => openFor("checkout")}
                className={`p-3 text-left transition-colors cursor-pointer ${
                  calOpen && selecting === "checkout"
                    ? "bg-[var(--primary-light)] border-b-2 border-b-[var(--primary)]"
                    : "hover:bg-[var(--bg-subtle)]"
                }`}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Check-out</p>
                <p className={`text-[13px] mt-0.5 font-medium ${checkOut ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>
                  {coLabel}
                </p>
              </button>
            </div>
          </div>

          {/* Calendar dropdown */}
          {calOpen && (
            <div className="mt-1 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-4 z-50 relative" style={{ boxShadow: "var(--shadow-md)" }}>
              <p className="text-[11px] text-center text-[var(--text-tertiary)] mb-3 font-medium">
                {selecting === "checkin" ? "Select check-in date" : "Select check-out date"}
              </p>
              <CalendarGrid
                checkIn={checkIn} checkOut={checkOut} hovered={hovered}
                selecting={selecting} onHover={setHovered}
                onSelect={handleDateSelect}
                year={calYear} month={calMonth}
                onPrev={prevMonth} onNext={nextMonth}
              />
              <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex items-center justify-between">
                <button type="button" onClick={clearDates}
                  className="text-[12px] text-[var(--text-tertiary)] underline cursor-pointer hover:text-[var(--text-primary)] transition-colors">
                  Clear dates
                </button>
                {nights > 0 && (
                  <span className="text-[12px] font-semibold text-[var(--primary)]">
                    {nights} night{nights !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Guests & Rooms dropdown */}
        <div className="mb-4" ref={guestsRef}>
          <label className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] block mb-2">Guests & Rooms</label>
          <button
            type="button"
            onClick={() => setGuestsOpen(o => !o)}
            className={`w-full p-3 border rounded-[var(--radius-sm)] text-left flex items-center justify-between cursor-pointer transition-colors ${
              guestsOpen
                ? "border-[var(--primary)] ring-2 ring-[var(--primary-light)]"
                : "border-[var(--border-default)] hover:border-[var(--primary)] bg-[var(--bg-subtle)]"
            }`}
          >
            <div>
              <p className="text-[13px] font-medium text-[var(--text-primary)]">
                {adults} adult{adults !== 1 ? "s" : ""}
                {children > 0 ? ` · ${children} child${children !== 1 ? "ren" : ""}` : ""}
                {" · "}{numRooms} room{numRooms !== 1 ? "s" : ""}
              </p>
            </div>
            <svg
              width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-[var(--text-secondary)] transition-transform ${guestsOpen ? "rotate-180" : ""}`}
            >
              <path d="M3 6L8 11L13 6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          {guestsOpen && (
            <div className="mt-1 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl px-4 py-1" style={{ boxShadow: "var(--shadow-md)" }}>
              <div className="divide-y divide-[var(--border-default)]">
                <Counter
                  label="Adults" sub={`Age ${CHILD_MAX_AGE + 1}+`}
                  value={adults}
                  onDec={() => {
                    const a = Math.max(1, adults - 1);
                    setAdults(a);
                    setNumRooms(Math.max(1, requiredRooms(a, children, selectedRoom)));
                  }}
                  onInc={() => {
                    const a = adults + 1;
                    setAdults(a);
                    setNumRooms(r => Math.max(r, requiredRooms(a, children, selectedRoom)));
                  }}
                  disableDec={adults <= 1}
                  disableInc={adults + children >= occupancy * MAX_ROOMS}
                />
                <Counter
                  label="Children" sub={`Ages ${CHILD_MIN_AGE}–${CHILD_MAX_AGE}`}
                  value={children}
                  onDec={() => {
                    const c = Math.max(0, children - 1);
                    setChildren(c);
                    setNumRooms(Math.max(1, requiredRooms(adults, c, selectedRoom)));
                  }}
                  onInc={() => {
                    const c = children + 1;
                    setChildren(c);
                    setNumRooms(r => Math.max(r, requiredRooms(adults, c, selectedRoom)));
                  }}
                  disableDec={children <= 0}
                  disableInc={adults + children >= occupancy * MAX_ROOMS}
                />
                <Counter
                  label="Rooms" sub={`${occupancy} guests max per room`}
                  value={numRooms}
                  onDec={() => setNumRooms(r => Math.max(requiredRooms(adults, children, selectedRoom), r - 1))}
                  onInc={() => setNumRooms(r => Math.min(Math.min(MAX_ROOMS, selectedRoom.available), r + 1))}
                  disableDec={numRooms <= requiredRooms(adults, children, selectedRoom)}
                  disableInc={numRooms >= Math.min(MAX_ROOMS, selectedRoom.available)}
                />
              </div>
              {numRooms > 1 && numRooms === requiredRooms(adults, children, selectedRoom) && (
                <p className="text-[11px] text-[var(--primary)] text-center pb-2 font-medium">
                  {numRooms} rooms added — {occupancy} guests max per room
                </p>
              )}
              <button
                type="button"
                onClick={() => setGuestsOpen(false)}
                className="w-full text-center text-[13px] font-semibold text-[var(--primary)] py-3 cursor-pointer hover:underline"
              >
                Done
              </button>
            </div>
          )}
        </div>

        {/* Infant crib */}
        <label className="flex items-center gap-3 mb-4 cursor-pointer group">
          <input
            type="checkbox"
            checked={infantCrib}
            onChange={e => setInfantCrib(e.target.checked)}
            className="w-4 h-4 rounded accent-[var(--primary)] cursor-pointer"
          />
          <span className="text-[13px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
            Travelling with an infant
          </span>
        </label>

        {/* Price breakdown */}
        <div className="mb-4 space-y-2 pt-4 border-t border-[var(--border-default)]">
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-secondary)]">
              {formatPrice(activeRoomPrice)} × {numRooms} room{numRooms > 1 ? "s" : ""} × {nights || 1} night{(nights || 1) !== 1 ? "s" : ""}
            </span>
            <span className="text-[var(--text-primary)] font-medium tabular-nums">{formatPrice(nightlyTotal * (nights || 1))}</span>
          </div>
          {extraPeople > 0 && extraOccupancyRate > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-secondary)]">
                Extra occupancy ({extraPeople} guest{extraPeople > 1 ? "s" : ""}) × {nights || 1} night{(nights || 1) !== 1 ? "s" : ""}
              </span>
              <span className="text-[var(--text-primary)] font-medium tabular-nums">{formatPrice(extraOccupancyTotal)}</span>
            </div>
          )}
          {nights > 0 && (
            <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-[var(--border-default)]">
              <span className="text-[var(--text-primary)]">Total</span>
              <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(subtotal)}</span>
            </div>
          )}
          {!nights && (
            <p className="text-[11px] text-[var(--text-tertiary)]">Select dates to see total</p>
          )}
        </div>

        {/* CTA */}
        {checkIn && checkOut ? (
          <Link
            href={`/hotels/${hotel.slug}/checkout?room=${encodeURIComponent(selectedRoom.name)}&checkin=${checkIn.toISOString().split("T")[0]}&checkout=${checkOut.toISOString().split("T")[0]}&adults=${adults}&children=${children}&rooms=${numRooms}&guests=${adults + children}${extraPeople > 0 && extraOccupancyRate > 0 ? `&extraPeople=${extraPeople}&extraRate=${extraOccupancyRate}` : ""}${infantCrib ? "&infant=1" : ""}`}
            className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-semibold rounded-[var(--radius-sm)] flex items-center justify-center gap-2 hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all"
          >
            Book Now
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => openFor("checkin")}
            className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-semibold rounded-[var(--radius-sm)] flex items-center justify-center gap-2 hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all cursor-pointer"
          >
            {checkIn ? "Select check-out date" : "Select dates to book"}
          </button>
        )}
        <p className="text-center text-[12px] text-[var(--text-tertiary)] mt-2">You won&apos;t be charged yet</p>

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
