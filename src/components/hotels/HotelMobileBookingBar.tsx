"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { applyHotelMargin } from "@/lib/constants";
import { useHotelRoom } from "@/components/hotels/HotelRoomContext";
import type { Hotel, HotelRoom, HotelSeasonDefinition } from "@/types/hotel";

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

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

function startOfDay(d: Date) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function isSameDay(a: Date, b: Date) { return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }
function isBefore(a: Date, b: Date) { return startOfDay(a) < startOfDay(b); }
function diffDays(a: Date, b: Date) { return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86400000); }
function fmt(d: Date) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }); }
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDOW(y: number, m: number) { return new Date(y, m, 1).getDay(); }

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type Selecting = "checkin" | "checkout";

/* ─── Calendar ───────────────────────────────────────────────────────────────── */

function CalendarGrid({ checkIn, checkOut, hovered, selecting, onHover, onSelect, year, month, onPrev, onNext }: {
  checkIn: Date | null; checkOut: Date | null; hovered: Date | null;
  selecting: Selecting; onHover: (d: Date | null) => void; onSelect: (d: Date) => void;
  year: number; month: number; onPrev: () => void; onNext: () => void;
}) {
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
              <button type="button" disabled={past} onClick={() => !past && onSelect(date)}
                onMouseEnter={() => !past && onHover(date)} onMouseLeave={() => onHover(null)}
                className={["w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium transition-all duration-100 cursor-pointer select-none",
                  past ? "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed" : "",
                  (isCI || isCO) ? "bg-[var(--primary)] text-[var(--text-inverse)] font-bold shadow-sm" : "",
                  !isCI && !isCO && !past ? "hover:bg-[var(--primary-light)] hover:text-[var(--primary)]" : "",
                  isToday && !isCI && !isCO ? "" : "",
                  inRange && !isCI && !isCO ? "text-[var(--primary)] font-semibold" : "",
                ].join(" ")}>{date.getDate()}</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────────── */

export function HotelMobileBookingBar({ hotel }: { hotel: Hotel }) {
  const {
    selections, hasSelections, hasInfant,
    totalRooms, totalAdults, totalChildren,
    setQty,
    checkIn, checkOut, setCheckIn, setCheckOut,
  } = useHotelRoom();

  const [sheetOpen, setSheetOpen] = useState(false);
  const today = new Date();
  const [selecting, setSelecting] = useState<Selecting>("checkin");
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [hovered, setHovered] = useState<Date | null>(null);
  const [calOpen, setCalOpen] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("tp_search");
      if (!raw) return;
      const s = JSON.parse(raw) as { startDate?: string; endDate?: string };
      if (s.startDate) { const d = new Date(s.startDate); setCheckIn(d); setCalYear(d.getFullYear()); setCalMonth(d.getMonth()); }
      if (s.endDate) setCheckOut(new Date(s.endDate));
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.style.overflow = sheetOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sheetOpen]);

  // Close sheet when last room is removed
  useEffect(() => {
    if (!hasSelections) setSheetOpen(false);
  }, [hasSelections]);

  const nights = checkIn && checkOut ? diffDays(checkIn, checkOut) : 0;
  const seasonLabel = checkIn && hotel.seasons ? getSeasonLabel(checkIn, hotel.seasons) : null;

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
  const minRoomPrice = hotel.rooms.length > 0 ? Math.min(...hotel.rooms.map((r) => r.price)) : 0;

  const selectionParams = [...selections.values()]
    .map((sel) => `r=${encodeURIComponent(`${sel.room.name}|${sel.qty}|${sel.adults}|${sel.children}`)}`)
    .join("&");

  const checkoutHref = checkIn && checkOut && hasSelections
    ? `/hotels/${hotel.slug}/checkout?checkin=${checkIn.toISOString().split("T")[0]}&checkout=${checkOut.toISOString().split("T")[0]}&${selectionParams}${hasInfant ? "&infant=1" : ""}`
    : null;

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

  const ciLabel = checkIn ? fmt(checkIn) : "Add date";
  const coLabel = checkOut ? fmt(checkOut) : "Add date";

  /* ── Sticky bar left-side label ── */
  let barLeft: React.ReactNode;
  if (!hasSelections) {
    barLeft = (
      <>
        <span className="text-[11px] text-[var(--text-tertiary)]">from </span>
        <span className="text-[17px] font-bold text-[var(--text-primary)] tabular-nums">{formatPrice(minRoomPrice)}</span>
        <span className="text-[12px] text-[var(--text-tertiary)]"> / night</span>
      </>
    );
  } else if (nights > 0) {
    barLeft = (
      <>
        <span className="text-[17px] font-bold text-[var(--text-primary)] tabular-nums">{formatPrice(grandTotal)}</span>
        <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
          {totalRooms} room{totalRooms !== 1 ? "s" : ""} · {nights} night{nights !== 1 ? "s" : ""}
        </p>
      </>
    );
  } else {
    barLeft = (
      <>
        <span className="text-[17px] font-bold text-[var(--text-primary)] tabular-nums">{formatPrice(perNightTotal)}</span>
        <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
          {totalRooms} room{totalRooms !== 1 ? "s" : ""} · {totalAdults} adult{totalAdults !== 1 ? "s" : ""}
          {totalChildren > 0 ? ` · ${totalChildren} child${totalChildren !== 1 ? "ren" : ""}` : ""}
        </p>
      </>
    );
  }

  return (
    <>
      {/* Sticky bar */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-[var(--bg-primary)] border-t border-[var(--border-default)] px-5 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">{barLeft}</div>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className="h-11 px-6 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-[var(--radius-full)] hover:bg-[var(--primary-hover)] transition-colors cursor-pointer shrink-0"
        >
          {checkoutHref ? "Book Now" : "Check availability"}
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
              <button type="button" onClick={() => setSheetOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-5 pb-4">

              {/* Dates */}
              <div className="mt-4 mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-2">Dates</p>
                <div className="border border-[var(--border-default)] rounded-[var(--radius-sm)] overflow-hidden">
                  <div className="grid grid-cols-2">
                    <button type="button" onClick={() => openFor("checkin")}
                      className={`p-3 text-left border-r border-[var(--border-default)] transition-colors cursor-pointer ${calOpen && selecting === "checkin" ? "bg-[var(--primary-light)]" : "hover:bg-[var(--bg-subtle)]"}`}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Check-in</p>
                      <p className={`text-[13px] mt-0.5 font-medium ${checkIn ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}>{ciLabel}</p>
                    </button>
                    <button type="button" onClick={() => openFor("checkout")}
                      className={`p-3 text-left transition-colors cursor-pointer ${calOpen && selecting === "checkout" ? "bg-[var(--primary-light)]" : "hover:bg-[var(--bg-subtle)]"}`}>
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
                    <CalendarGrid checkIn={checkIn} checkOut={checkOut} hovered={hovered}
                      selecting={selecting} onHover={setHovered} onSelect={handleDateSelect}
                      year={calYear} month={calMonth} onPrev={prevMonth} onNext={nextMonth} />
                    <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex items-center justify-between">
                      <button type="button" onClick={() => { setCheckIn(null); setCheckOut(null); setSelecting("checkin"); setCalOpen(false); }}
                        className="text-[12px] text-[var(--text-tertiary)] underline cursor-pointer hover:text-[var(--text-primary)] transition-colors">
                        Clear dates
                      </button>
                      {nights > 0 && <span className="text-[12px] font-semibold text-[var(--primary)]">{nights} night{nights !== 1 ? "s" : ""}</span>}
                    </div>
                  </div>
                )}
              </div>

              {/* Room summary */}
              <div className="mb-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)] mb-2">
                  {hasSelections
                    ? `${totalRooms} room${totalRooms !== 1 ? "s" : ""} · ${totalAdults} adult${totalAdults !== 1 ? "s" : ""}${totalChildren > 0 ? ` · ${totalChildren} child${totalChildren !== 1 ? "ren" : ""}` : ""}`
                    : "Rooms"}
                </p>
                <div className="space-y-2">
                  {lineItems.map(({ sel, pricePerNight }) => (
                    <div key={sel.room.name} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-subtle)]">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold text-[var(--text-primary)]">
                          {sel.room.name} <span className="text-[var(--text-tertiary)] font-normal">×{sel.qty}</span>
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                          {sel.adults} adult{sel.adults !== 1 ? "s" : ""}{sel.children > 0 ? ` · ${sel.children} child${sel.children !== 1 ? "ren" : ""}` : ""}
                          {sel.infant ? " · infant" : ""}
                        </p>
                      </div>
                      <p className="text-[13px] font-bold text-[var(--text-primary)] tabular-nums shrink-0">
                        {formatPrice(pricePerNight * sel.qty)}
                        <span className="text-[11px] font-normal text-[var(--text-tertiary)]">/night</span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setQty(sel.room, 0)}
                        aria-label={`Remove ${sel.room.name}`}
                        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--error)] transition-colors cursor-pointer shrink-0"
                      >
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
                          <line x1="2" y1="2" x2="10" y2="10"/><line x1="10" y1="2" x2="2" y2="10"/>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price breakdown */}
              {hasSelections && (
                <div className="space-y-2 pt-4 border-t border-[var(--border-default)]">
                  {lineItems.map(({ sel, pricePerNight, extraPeople, extraRate, extraTotal }) => (
                    <div key={sel.room.name}>
                      <div className="flex justify-between text-[13px]">
                        <span className="text-[var(--text-secondary)]">
                          {sel.room.name} ×{sel.qty} × {nights || 1} night{(nights || 1) !== 1 ? "s" : ""}
                        </span>
                        <span className="text-[var(--text-primary)] font-medium tabular-nums">
                          {formatPrice(pricePerNight * sel.qty * (nights || 1))}
                        </span>
                      </div>
                      {extraPeople > 0 && extraRate > 0 && (
                        <div className="flex justify-between text-[12px] mt-0.5">
                          <span className="text-[var(--text-tertiary)]">Extra occupancy ({extraPeople} guest{extraPeople > 1 ? "s" : ""})</span>
                          <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(extraTotal)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {nights > 0 ? (
                    <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-[var(--border-default)]">
                      <span className="text-[var(--text-primary)]">Total</span>
                      <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(grandTotal)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[13px] font-semibold pt-2 border-t border-[var(--border-default)]">
                      <span className="text-[var(--text-secondary)]">Per night</span>
                      <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(perNightTotal)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="shrink-0 px-5 py-4 border-t border-[var(--border-default)]">
              {checkoutHref ? (
                <Link href={checkoutHref}
                  className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-semibold rounded-[var(--radius-sm)] flex items-center justify-center hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all">
                  Book Now
                </Link>
              ) : (
                <button type="button"
                  onClick={() => {
                    if (!hasSelections && checkIn && checkOut) {
                      setSheetOpen(false);
                      setTimeout(() => {
                        document.getElementById("rooms")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 150);
                    } else if (!hasSelections) {
                      setSheetOpen(false);
                    } else {
                      openFor("checkin");
                    }
                  }}
                  className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-semibold rounded-[var(--radius-sm)] flex items-center justify-center hover:bg-[var(--primary-hover)] active:scale-[0.98] transition-all cursor-pointer">
                  {!hasSelections && checkIn && checkOut
                    ? "Select rooms below"
                    : !hasSelections
                    ? "Select dates to book"
                    : checkIn
                    ? "Select check-out date"
                    : "Select dates to book"}
                </button>
              )}
              <p className="text-center text-[12px] text-[var(--text-tertiary)] mt-2">You won&apos;t be charged yet</p>

              {hasSelections && (
                <a href={`https://wa.me/923216650670?text=${encodeURIComponent(`Hi! I'd like to book at ${hotel.name}.\n\n${[...selections.values()].map(s => `• ${s.room.name} ×${s.qty} — ${s.adults}A${s.children > 0 ? ` ${s.children}C` : ""}${s.infant ? " + infant" : ""}`).join("\n")}\n${checkIn && checkOut ? `Dates: ${fmt(checkIn)} – ${fmt(checkOut)} (${nights} nights)\n` : ""}${grandTotal > 0 ? `Est. total: ${formatPrice(grandTotal)}\n` : ""}\nPlease confirm availability.`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="mt-3 w-full h-10 border border-[var(--border-default)] rounded-[var(--radius-sm)] flex items-center justify-center gap-2 text-[13px] font-medium text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors">
                  <Icon name="whatsapp" size="sm" color="currentColor" />
                  Enquire on WhatsApp
                </a>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
