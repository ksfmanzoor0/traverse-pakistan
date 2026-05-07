"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import {
  applyHotelMargin,
  CHILD_MIN_AGE,
  CHILD_MAX_AGE,
  DEFAULT_ROOM_CAPACITY,
} from "@/lib/constants";
import type { Hotel, HotelRoom, HotelSeasonDefinition } from "@/types/hotel";

/* ── Helpers (mirrors HotelBookingSidebar) ───────────────────────────────────── */

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
    if (match) return applyHotelMargin(match.price);
  }
  return room.price;
}

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isBefore(a: Date, b: Date) { return startOfDay(a) < startOfDay(b); }
function diffDays(a: Date, b: Date) {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000);
}
function fmt(d: Date) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDOW(y: number, m: number) { return new Date(y, m, 1).getDay(); }

type Selecting = "checkin" | "checkout";

/* ── Calendar ────────────────────────────────────────────────────────────────── */

interface CalendarProps {
  checkIn: Date | null; checkOut: Date | null; hovered: Date | null;
  selecting: Selecting; onHover: (d: Date | null) => void; onSelect: (d: Date) => void;
  year: number; month: number; onPrev: () => void; onNext: () => void;
}

function CalendarGrid({ checkIn, checkOut, hovered, selecting, onHover, onSelect, year, month, onPrev, onNext }: CalendarProps) {
  const today = startOfDay(new Date());
  const cells: (Date | null)[] = [
    ...Array(getFirstDOW(year, month)).fill(null),
    ...Array.from({ length: getDaysInMonth(year, month) }, (_, i) => new Date(year, month, i + 1)),
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
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[11px] font-semibold text-[var(--text-tertiary)] py-1">{d}</div>
        ))}
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
                className={["w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium transition-all duration-100 cursor-pointer select-none", past ? "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed" : "", (isCI || isCO) ? "bg-[var(--primary)] text-[var(--text-inverse)] font-bold shadow-sm" : "", !isCI && !isCO && !past ? "hover:bg-[var(--primary-light)] hover:text-[var(--primary)]" : "", isToday && !isCI && !isCO ? "border border-[var(--primary)] text-[var(--primary)]" : "", inRange && !isCI && !isCO ? "text-[var(--primary)] font-semibold" : ""].join(" ")}>
                {date.getDate()}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Counter ─────────────────────────────────────────────────────────────────── */

function Counter({ label, sub, value, onDec, onInc, disableDec, disableInc }: {
  label: string; sub: string; value: number;
  onDec: () => void; onInc: () => void; disableDec: boolean; disableInc: boolean;
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

/* ── Capacity helpers ────────────────────────────────────────────────────────── */

const MAX_ROOMS = 10;

function getCapacity(room: HotelRoom) { return room.capacity ?? DEFAULT_ROOM_CAPACITY; }
function maxOccupancyPerRoom(room: HotelRoom): number {
  const cap = getCapacity(room);
  return cap.maxOccupancy ?? (cap.adults + cap.children);
}
function requiredRooms(adults: number, children: number, room: HotelRoom): number {
  return Math.max(1, Math.ceil((adults + children) / maxOccupancyPerRoom(room)));
}
function bedType(beds: string): string {
  return beds.split("·")[0].trim();
}

/* ── Main component ──────────────────────────────────────────────────────────── */

interface HotelMobileBookingBarProps {
  hotel: Hotel;
  selectedRoom: HotelRoom;
  onRoomChange: (room: HotelRoom) => void;
}

export function HotelMobileBookingBar({ hotel, selectedRoom, onRoomChange }: HotelMobileBookingBarProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const today = new Date();

  const [calOpen, setCalOpen] = useState(false);
  const [selecting, setSelecting] = useState<Selecting>("checkin");
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [numRooms, setNumRooms] = useState(1);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infantCrib, setInfantCrib] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  // Pre-populate from search sessionStorage
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
        const ci = new Date(s.startDate);
        setCheckIn(ci);
        setCalYear(ci.getFullYear());
        setCalMonth(ci.getMonth());
      }
      if (s.endDate) setCheckOut(new Date(s.endDate));
      if (s.travelers) {
        const a = Math.max(1, s.travelers.adults || 1);
        const c = s.travelers.children || 0;
        setAdults(a);
        setChildren(c);
        setNumRooms(requiredRooms(a, c, selectedRoom));
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Adjust numRooms when room changes from outside (room card tap)
  useEffect(() => {
    setNumRooms(n => Math.max(n, requiredRooms(adults, children, selectedRoom)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom]);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  const occupancy = maxOccupancyPerRoom(selectedRoom);
  const seasonLabel = hotel.seasons && checkIn ? getSeasonLabel(checkIn, hotel.seasons) : null;
  const activeRoomPrice = getRoomPrice(selectedRoom, seasonLabel);
  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;
  const extraPeople = Math.max(0, adults + children - 2 * numRooms);
  const extraOccupancyRate = selectedRoom.extraOccupancyCharge ?? 0;
  const extraOccupancyTotal = extraOccupancyRate * extraPeople * (nights || 1);
  const subtotal = activeRoomPrice * numRooms * (nights || 1) + extraOccupancyTotal;

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

  function clearDates() { setCheckIn(null); setCheckOut(null); setSelecting("checkin"); }
  function prevMonth() { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }
  function nextMonth() { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }

  const ciLabel = checkIn ? fmt(checkIn) : "Add date";
  const coLabel = checkOut ? fmt(checkOut) : "Add date";

  const checkoutHref = checkIn && checkOut
    ? `/hotels/${hotel.slug}/checkout?room=${encodeURIComponent(selectedRoom.name)}&checkin=${checkIn.toISOString().split("T")[0]}&checkout=${checkOut.toISOString().split("T")[0]}&adults=${adults}&children=${children}&rooms=${numRooms}&guests=${adults + children}${extraPeople > 0 && extraOccupancyRate > 0 ? `&extraPeople=${extraPeople}&extraRate=${extraOccupancyRate}` : ""}${infantCrib ? "&infant=1" : ""}`
    : null;

  return (
    <>
      {/* Sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-[var(--bg-primary)] border-t border-[var(--border-default)] px-5 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-[var(--text-primary)] tabular-nums">{formatPrice(activeRoomPrice)}</span>
            <span className="text-[13px] text-[var(--text-tertiary)]">/ night</span>
          </div>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 truncate max-w-[180px]">
            {selectedRoom.name !== hotel.rooms[0].name ? selectedRoom.name : (
              <span className="inline-flex items-center gap-1">
                <Icon name="star" size="xs" weight="fill" color="var(--primary-muted)" />
                {hotel.rating} · {hotel.reviewCount} reviews
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="h-11 px-6 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-[var(--radius-full)] hover:bg-[var(--primary-hover)] transition-colors cursor-pointer shrink-0"
        >
          {checkIn && checkOut ? "Book Now" : "Check availability"}
        </button>
      </div>

      {/* Sheet */}
      {sheetOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setSheetOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 bg-[var(--bg-primary)] rounded-t-[var(--radius-lg)] max-h-[92vh] flex flex-col">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--border-default)]" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border-default)] shrink-0">
              <h2 className="text-[16px] font-bold text-[var(--text-primary)]">Book your stay</h2>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 pb-4">

              {/* Room type */}
              <div className="mt-4 mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-2">Room Type</p>
                <div className="space-y-2">
                  {hotel.rooms.map((room) => (
                    <button
                      key={room.name}
                      type="button"
                      onClick={() => { onRoomChange(room); setNumRooms(r => Math.max(requiredRooms(adults, children, room), r)); }}
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
                              <> · {room.capacity.adults} adult{room.capacity.adults !== 1 ? "s" : ""}{room.capacity.children > 0 ? ` · ${room.capacity.children} child${room.capacity.children !== 1 ? "ren" : ""}` : ""}</>
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

              {/* Dates */}
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-2">Dates</p>
                <div className="border border-[var(--border-default)] rounded-[var(--radius-sm)] overflow-hidden">
                  <div className="grid grid-cols-2">
                    <button
                      type="button"
                      onClick={() => openFor("checkin")}
                      className={`p-3 text-left border-r border-[var(--border-default)] transition-colors cursor-pointer ${
                        calOpen && selecting === "checkin" ? "bg-[var(--primary-light)]" : "hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Check-in</p>
                      <p className={`text-[13px] mt-0.5 font-medium ${checkIn ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>{ciLabel}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openFor("checkout")}
                      className={`p-3 text-left transition-colors cursor-pointer ${
                        calOpen && selecting === "checkout" ? "bg-[var(--primary-light)]" : "hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Check-out</p>
                      <p className={`text-[13px] mt-0.5 font-medium ${checkOut ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>{coLabel}</p>
                    </button>
                  </div>
                </div>
                {calOpen && (
                  <div className="mt-2 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-4">
                    <p className="text-[11px] text-center text-[var(--text-tertiary)] mb-3 font-medium">
                      {selecting === "checkin" ? "Select check-in date" : "Select check-out date"}
                    </p>
                    <CalendarGrid
                      checkIn={checkIn} checkOut={checkOut} hovered={hovered}
                      selecting={selecting} onHover={setHovered} onSelect={handleDateSelect}
                      year={calYear} month={calMonth} onPrev={prevMonth} onNext={nextMonth}
                    />
                    <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex items-center justify-between">
                      <button type="button" onClick={clearDates}
                        className="text-[12px] text-[var(--text-tertiary)] underline cursor-pointer hover:text-[var(--text-primary)] transition-colors">
                        Clear dates
                      </button>
                      {nights > 0 && (
                        <span className="text-[12px] font-semibold text-[var(--primary)]">{nights} night{nights !== 1 ? "s" : ""}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Guests & Rooms */}
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-2">Guests & Rooms</p>
                <button
                  type="button"
                  onClick={() => setGuestsOpen(o => !o)}
                  className={`w-full p-3 border rounded-[var(--radius-sm)] text-left flex items-center justify-between cursor-pointer transition-colors ${
                    guestsOpen
                      ? "border-[var(--primary)] ring-2 ring-[var(--primary-light)]"
                      : "border-[var(--border-default)] hover:border-[var(--primary)] bg-[var(--bg-subtle)]"
                  }`}
                >
                  <p className="text-[13px] font-medium text-[var(--text-primary)]">
                    {adults} adult{adults !== 1 ? "s" : ""}
                    {children > 0 ? ` · ${children} child${children !== 1 ? "ren" : ""}` : ""}
                    {" · "}{numRooms} room{numRooms !== 1 ? "s" : ""}
                  </p>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`text-[var(--text-secondary)] transition-transform shrink-0 ${guestsOpen ? "rotate-180" : ""}`}>
                    <path d="M3 6L8 11L13 6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {guestsOpen && (
                  <div className="mt-1 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl px-4 py-1">
                    <div className="divide-y divide-[var(--border-default)]">
                      <Counter
                        label="Adults" sub={`Age ${CHILD_MAX_AGE + 1}+`} value={adults}
                        onDec={() => { const a = Math.max(1, adults - 1); setAdults(a); setNumRooms(Math.max(1, requiredRooms(a, children, selectedRoom))); }}
                        onInc={() => { const a = adults + 1; setAdults(a); setNumRooms(r => Math.max(r, requiredRooms(a, children, selectedRoom))); }}
                        disableDec={adults <= 1}
                        disableInc={adults + children >= occupancy * MAX_ROOMS}
                      />
                      <Counter
                        label="Children" sub={`Ages ${CHILD_MIN_AGE}–${CHILD_MAX_AGE}`} value={children}
                        onDec={() => { const c = Math.max(0, children - 1); setChildren(c); setNumRooms(Math.max(1, requiredRooms(adults, c, selectedRoom))); }}
                        onInc={() => { const c = children + 1; setChildren(c); setNumRooms(r => Math.max(r, requiredRooms(adults, c, selectedRoom))); }}
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
                    <button type="button" onClick={() => setGuestsOpen(false)}
                      className="w-full text-center text-[13px] font-semibold text-[var(--primary)] py-3 cursor-pointer hover:underline">
                      Done
                    </button>
                  </div>
                )}
              </div>

              {/* Infant crib */}
              <label className="flex items-center gap-3 mb-5 cursor-pointer group">
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
              <div className="space-y-2 pt-4 border-t border-[var(--border-default)]">
                <div className="flex justify-between text-[13px]">
                  <span className="text-[var(--text-secondary)]">
                    {formatPrice(activeRoomPrice)} × {numRooms} room{numRooms > 1 ? "s" : ""} × {nights || 1} night{(nights || 1) !== 1 ? "s" : ""}
                  </span>
                  <span className="text-[var(--text-primary)] font-medium tabular-nums">{formatPrice(activeRoomPrice * numRooms * (nights || 1))}</span>
                </div>
                {extraPeople > 0 && extraOccupancyRate > 0 && (
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[var(--text-secondary)]">
                      Extra occupancy ({extraPeople} guest{extraPeople > 1 ? "s" : ""}) × {nights || 1} night{(nights || 1) !== 1 ? "s" : ""}
                    </span>
                    <span className="text-[var(--text-primary)] font-medium tabular-nums">{formatPrice(extraOccupancyTotal)}</span>
                  </div>
                )}
                {nights > 0 ? (
                  <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-[var(--border-default)]">
                    <span className="text-[var(--text-primary)]">Total</span>
                    <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(subtotal)}</span>
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-tertiary)]">Select dates to see total</p>
                )}
              </div>
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 px-5 py-4 border-t border-[var(--border-default)]">
              {checkoutHref ? (
                <Link
                  href={checkoutHref}
                  className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-semibold rounded-[var(--radius-sm)] flex items-center justify-center hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all"
                >
                  Book Now
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openFor("checkin")}
                  className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-semibold rounded-[var(--radius-sm)] flex items-center justify-center hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all cursor-pointer"
                >
                  {checkIn ? "Select check-out date" : "Select dates to book"}
                </button>
              )}
              <p className="text-center text-[12px] text-[var(--text-tertiary)] mt-2">You won&apos;t be charged yet</p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
