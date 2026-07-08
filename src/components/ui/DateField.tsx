"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromIso(s: string): Date | null {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return isNaN(dt.getTime()) ? null : dt;
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function daysInMonth(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  const last = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= last; d++) cells.push(new Date(year, month, d));
  return cells;
}

type Mode = "future" | "past" | "any";

export function DateField({
  value,
  onChange,
  placeholder = "Select date",
  required,
  mode = "any",
  minYear,
  maxYear,
  minDate,
}: {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  required?: boolean;
  mode?: Mode;
  minYear?: number;
  maxYear?: number;
  /** ISO YYYY-MM-DD; dates strictly before this are disabled. */
  minDate?: string;
}) {
  const minDateParsed = minDate ? fromIso(minDate) : null;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const parsed = fromIso(value);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const initial = parsed ?? today;
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  useEffect(() => {
    if (parsed) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]); // eslint-disable-line

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current || wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const y0 = minYear ?? (mode === "past" ? 1920 : today.getFullYear());
  const y1 = maxYear ?? (mode === "past" ? today.getFullYear() : today.getFullYear() + 20);
  const years: number[] = [];
  for (let y = y0; y <= y1; y++) years.push(y);

  function prevMonth() {
    let m = viewMonth - 1, y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (y < y0) return;
    setViewMonth(m); setViewYear(y);
  }
  function nextMonth() {
    let m = viewMonth + 1, y = viewYear;
    if (m > 11) { m = 0; y += 1; }
    if (y > y1) return;
    setViewMonth(m); setViewYear(y);
  }

  const cells = daysInMonth(viewYear, viewMonth);
  const display = parsed ? parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "";

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "w-full h-11 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-left text-[15px]",
          "focus:outline-none focus:border-[var(--primary)]",
          display ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
        )}
      >
        {display || placeholder}
      </button>
      {required && !parsed && <input type="text" required value="" onChange={() => {}} className="sr-only" aria-hidden tabIndex={-1} />}

      {open && (
        <div className="absolute z-50 mt-2 w-[300px] bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] shadow-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <button type="button" onClick={prevMonth}
              className="w-8 h-8 rounded-full hover:bg-[var(--bg-subtle)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(Number(e.target.value))}
              className="flex-1 h-8 px-2 text-[14px] font-semibold text-[var(--text-primary)] bg-transparent focus:outline-none"
            >
              {MONTHS.map((m, i) => (<option key={m} value={i}>{m}</option>))}
            </select>
            <select
              value={viewYear}
              onChange={(e) => setViewYear(Number(e.target.value))}
              className="h-8 px-2 text-[14px] font-semibold text-[var(--text-primary)] bg-transparent focus:outline-none"
            >
              {years.map((y) => (<option key={y} value={y}>{y}</option>))}
            </select>
            <button type="button" onClick={nextMonth}
              className="w-8 h-8 rounded-full hover:bg-[var(--bg-subtle)] flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[11px] font-semibold text-[var(--text-tertiary)] py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="h-9" />;
              const isSel = parsed && isSameDay(parsed, d);
              const isToday = isSameDay(today, d);
              const disabled =
                (mode === "future" && d < today) ||
                (mode === "past" && d > today) ||
                (minDateParsed !== null && d < minDateParsed);
              return (
                <button
                  key={i}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange(toIso(d)); setOpen(false); }}
                  className={cn(
                    "h-9 rounded-full text-[13px] font-medium transition-all",
                    disabled && "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed",
                    !disabled && isSel && "bg-[var(--primary)] text-[var(--text-inverse)]",
                    !disabled && !isSel && isToday && "border border-[var(--border-strong)]",
                    !disabled && !isSel && !isToday && "hover:bg-[var(--bg-subtle)] text-[var(--text-primary)]"
                  )}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
