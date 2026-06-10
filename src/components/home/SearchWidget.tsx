"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { useState, useRef, useEffect, useId } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

const SEGMENT_SPRING = { duration: 0.4, ease: [0.32, 0.72, 0, 1] } as const;
const DROP_SPRING = { duration: 0.4, ease: [0.32, 0.72, 0, 1] } as const;

const tabs = [
  { id: "packages", label: "Custom Tours" },
  { id: "hotels", label: "Hotels" },
  { id: "grouptours", label: "Group Tours" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export type DestinationOption = {
  name: string;
  slug: string;
  region: string;
  parentSlug?: string | null;
};

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isInRange(d: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  const t = d.getTime();
  return t > start.getTime() && t < end.getTime();
}

type ActiveField = "destination" | "when" | "travelers" | "month" | "groupsize" | "checkin" | "checkout" | "guests" | null;

// ── Calendar Panel ──────────────────────────────────────────────────────────
export function CalendarPanel({
  rangeMode,
  startDate,
  endDate,
  onSelect,
}: {
  rangeMode: boolean;
  startDate: Date | null;
  endDate: Date | null;
  onSelect: (date: Date) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hovered, setHovered] = useState<Date | null>(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Quick shortcuts
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const thisWeekendStart = new Date(today);
  thisWeekendStart.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
  const thisWeekendEnd = new Date(thisWeekendStart); thisWeekendEnd.setDate(thisWeekendStart.getDate() + 1);

  const shortcuts = [
    { label: "Today", sub: today.toLocaleDateString("en-US", { month: "short", day: "numeric" }), start: today, end: null },
    { label: "Tomorrow", sub: tomorrow.toLocaleDateString("en-US", { month: "short", day: "numeric" }), start: tomorrow, end: null },
    {
      label: "This weekend",
      sub: `${thisWeekendStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${thisWeekendEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      start: thisWeekendStart, end: thisWeekendEnd,
    },
  ];

  function handleShortcut(start: Date, end: Date | null) {
    onSelect(start);
    if (end) onSelect(end);
    setViewMonth(start.getMonth());
    setViewYear(start.getFullYear());
  }

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const effectiveEnd = rangeMode && startDate && !endDate && hovered
    ? (hovered >= startDate ? hovered : startDate) : endDate;
  const effectiveStart = rangeMode && startDate && !endDate && hovered && hovered < startDate
    ? hovered : startDate;

  function isShortcutActive(s: { start: Date; end: Date | null }) {
    if (!startDate) return false;
    if (s.end) return isSameDay(startDate, s.start) && !!endDate && isSameDay(endDate, s.end);
    return isSameDay(startDate, s.start) && !endDate;
  }

  return (
    <div className="flex">
      {/* Left: Shortcuts */}
      <div className="w-[200px] shrink-0 border-r border-[var(--border-default)] p-4 space-y-3">
        {shortcuts.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => handleShortcut(s.start, s.end)}
            className={cn(
              "w-full text-left px-4 py-4 rounded-xl border transition-all cursor-pointer",
              isShortcutActive(s)
                ? "border-[var(--text-primary)] bg-[var(--bg-subtle)]"
                : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
            )}
          >
            <p className="text-[15px] font-semibold text-[var(--text-primary)]">{s.label}</p>
            <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">{s.sub}</p>
          </button>
        ))}
      </div>

      {/* Right: Calendar */}
      <div className="flex-1 p-5">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-5">
          <button type="button" onClick={prevMonth}
            className="w-9 h-9 rounded-full hover:bg-[var(--bg-subtle)] flex items-center justify-center transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span className="text-[16px] font-semibold text-[var(--text-primary)]">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button type="button" onClick={nextMonth}
            className="w-9 h-9 rounded-full hover:bg-[var(--bg-subtle)] flex items-center justify-center transition-colors cursor-pointer">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Day labels */}
        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[13px] font-semibold text-[var(--text-tertiary)] py-1.5">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="h-11" />;
            const isPast = date < today;
            const isStart = startDate ? isSameDay(date, startDate) : false;
            const isEnd = endDate ? isSameDay(date, endDate) : false;
            const inRange = isInRange(date, effectiveStart, effectiveEnd);
            const isToday = isSameDay(date, today);

            return (
              <div key={i} className="relative flex items-center justify-center h-11">
                {/* Range background strip */}
                {inRange && <div className="absolute inset-y-1 left-0 right-0 bg-[var(--bg-subtle)]" />}
                {isStart && effectiveEnd && <div className="absolute inset-y-1 left-1/2 right-0 bg-[var(--bg-subtle)]" />}
                {isEnd && effectiveStart && <div className="absolute inset-y-1 left-0 right-1/2 bg-[var(--bg-subtle)]" />}

                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => !isPast && onSelect(date)}
                  onMouseEnter={() => setHovered(date)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    "relative z-10 w-11 h-11 rounded-full text-[15px] font-medium transition-all cursor-pointer select-none",
                    isPast && "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed",
                    !isPast && !isStart && !isEnd && "hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]",
                    isToday && !isStart && !isEnd && !isPast && "font-bold",
                    (isStart || isEnd) && "bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold",
                  )}
                >
                  {date.getDate()}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {startDate && (
          <div className="mt-4 pt-4 border-t border-[var(--border-default)] flex items-center justify-between">
            <button type="button" onClick={() => onSelect(new Date(0))}
              className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--primary)] underline cursor-pointer">
              Clear dates
            </button>
            {rangeMode && startDate && endDate && (
              <span className="text-[13px] text-[var(--text-tertiary)]">
                {Math.round((endDate.getTime() - startDate.getTime()) / 86400000)} nights
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stays Calendar (two months, Airbnb Stays style) ─────────────────────────
type FlexDuration = "weekend" | "week" | "month";

function computeFlexEnd(start: Date, dur: FlexDuration): Date {
  if (dur === "weekend") { const d = new Date(start); d.setDate(d.getDate() + 2); return d; }
  if (dur === "week") { const d = new Date(start); d.setDate(d.getDate() + 7); return d; }
  return new Date(start.getFullYear(), start.getMonth() + 1, 0);
}

export function StaysCalendarPanel({
  startDate,
  endDate,
  onSelect,
  onFlexSelect,
}: {
  startDate: Date | null;
  endDate: Date | null;
  onSelect: (date: Date) => void;
  onFlexSelect?: (start: Date, end: Date) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [hovered, setHovered] = useState<Date | null>(null);
  const [mode, setMode] = useState<"dates" | "flexible">("dates");
  const [flexDuration, setFlexDuration] = useState<FlexDuration | null>(null);
  const [flexMonth, setFlexMonth] = useState<Date | null>(null);

  const secondMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  const secondYear = viewMonth === 11 ? viewYear + 1 : viewYear;

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const effectiveEnd = startDate && !endDate && hovered
    ? (hovered >= startDate ? hovered : startDate) : endDate;
  const effectiveStart = startDate && !endDate && hovered && hovered < startDate
    ? hovered : startDate;

  function handleFlexDuration(dur: FlexDuration) {
    setFlexDuration(dur);
    if (flexMonth && onFlexSelect) onFlexSelect(flexMonth, computeFlexEnd(flexMonth, dur));
  }

  function handleFlexMonth(monthStart: Date) {
    setFlexMonth(monthStart);
    if (flexDuration && onFlexSelect) onFlexSelect(monthStart, computeFlexEnd(monthStart, flexDuration));
  }

  const upcomingMonths = Array.from({ length: 12 }, (_, i) =>
    new Date(today.getFullYear(), today.getMonth() + i, 1)
  );

  function renderMonth(year: number, month: number, showPrev: boolean, showNext: boolean) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (Date | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);

    return (
      <div className="flex-1">
        <div className="flex items-center justify-between mb-2">
          {showPrev ? (
            <button type="button" onClick={prevMonth}
              className="w-8 h-8 rounded-full hover:bg-[var(--bg-subtle)] flex items-center justify-center transition-colors cursor-pointer border border-[var(--border-default)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
          ) : <div className="w-8" />}
          <span className="text-[15px] font-semibold text-[var(--text-primary)]">{MONTH_NAMES[month]} {year}</span>
          {showNext ? (
            <button type="button" onClick={nextMonth}
              className="w-8 h-8 rounded-full hover:bg-[var(--bg-subtle)] flex items-center justify-center transition-colors cursor-pointer border border-[var(--border-default)]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          ) : <div className="w-8" />}
        </div>

        <div className="grid grid-cols-7 mb-2">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[12px] font-semibold text-[var(--text-tertiary)] py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((date, i) => {
            if (!date) return <div key={i} className="h-9" />;
            const isPast = date < today;
            const isStart = startDate ? isSameDay(date, startDate) : false;
            const isEnd = endDate ? isSameDay(date, endDate) : false;
            const inRange = isInRange(date, effectiveStart, effectiveEnd);
            const isToday = isSameDay(date, today);

            return (
              <div key={i} className="relative flex items-center justify-center h-9">
                {inRange && <div className="absolute inset-y-1 left-0 right-0 bg-[var(--primary-light)]" />}
                {isStart && effectiveEnd && <div className="absolute inset-y-1 left-1/2 right-0 bg-[var(--primary-light)]" />}
                {isEnd && effectiveStart && <div className="absolute inset-y-1 left-0 right-1/2 bg-[var(--primary-light)]" />}
                <button
                  type="button"
                  disabled={isPast}
                  onClick={() => !isPast && onSelect(date)}
                  onMouseEnter={() => setHovered(date)}
                  onMouseLeave={() => setHovered(null)}
                  className={cn(
                    "relative z-10 w-9 h-9 rounded-full text-[14px] font-medium transition-all cursor-pointer select-none",
                    isPast && "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed",
                    !isPast && !isStart && !isEnd && "hover:border hover:border-[var(--text-primary)] text-[var(--text-primary)]",
                    isToday && !isStart && !isEnd && !isPast && "font-bold underline decoration-[var(--primary)] underline-offset-2",
                    (isStart || isEnd) && "bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold",
                  )}
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

  const nights = startDate && endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / 86400000) : 0;

  return (
    <div>
      {/* Dates / Flexible toggle */}
      <div className="flex justify-center pt-2 pb-2 border-b border-[var(--border-default)]">
        <div className="flex items-center bg-[var(--bg-subtle)] rounded-full p-1">
          <button type="button" onClick={() => setMode("dates")}
            className={cn(
              "px-6 py-2 rounded-full text-[14px] font-semibold transition-all cursor-pointer",
              mode === "dates"
                ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}>
            Dates
          </button>
          <button type="button" onClick={() => setMode("flexible")}
            className={cn(
              "px-6 py-2 rounded-full text-[14px] font-semibold transition-all cursor-pointer",
              mode === "flexible"
                ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}>
            Flexible
          </button>
        </div>
      </div>

      {/* Dates mode — two-month calendar */}
      {mode === "dates" && (
        <>
          <div className="flex gap-8 px-8 py-3">
            {renderMonth(viewYear, viewMonth, true, false)}
            <div className="w-px bg-[var(--border-default)] shrink-0" />
            {renderMonth(secondYear, secondMonth, false, true)}
          </div>
          <div className="px-8 pb-4 border-t border-[var(--border-default)] pt-3 flex items-center justify-between">
            <button type="button" onClick={() => onSelect(new Date(0))}
              className="text-[13px] font-semibold text-[var(--text-primary)] underline hover:text-[var(--primary)] cursor-pointer">
              Clear dates
            </button>
            {startDate && endDate && (
              <p className="text-[13px] text-[var(--text-tertiary)]">
                {nights} night{nights !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </>
      )}

      {/* Flexible mode — duration + month cards */}
      {mode === "flexible" && (
        <div className="px-8 py-6 space-y-6">
          <div className="text-center">
            <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-4">How long would you like to stay?</p>
            <div className="flex justify-center gap-3">
              {(["weekend", "week", "month"] as FlexDuration[]).map((dur) => (
                <button
                  key={dur}
                  type="button"
                  onClick={() => handleFlexDuration(dur)}
                  className={cn(
                    "h-10 px-6 rounded-full text-[14px] font-medium border transition-all cursor-pointer",
                    flexDuration === dur
                      ? "border-[var(--text-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
                      : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                  )}
                >
                  {dur === "weekend" ? "Weekend" : dur === "week" ? "Week" : "Month"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-4 text-center">Go anytime</p>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {upcomingMonths.map((d, i) => {
                const isSelected = flexMonth
                  && d.getFullYear() === flexMonth.getFullYear()
                  && d.getMonth() === flexMonth.getMonth();
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleFlexMonth(d)}
                    className={cn(
                      "shrink-0 flex flex-col items-center gap-2 w-[110px] py-4 px-3 rounded-[var(--radius-md)] border transition-all cursor-pointer",
                      isSelected
                        ? "border-[var(--text-primary)] bg-[var(--bg-subtle)]"
                        : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                    )}
                  >
                    <Icon name="calendar" size={24} color="var(--text-secondary)" />
                    <span className="text-[14px] font-semibold text-[var(--text-primary)]">{MONTH_NAMES[d.getMonth()]}</span>
                    <span className="text-[12px] text-[var(--text-tertiary)]">{d.getFullYear()}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ── Main SearchWidget ───────────────────────────────────────────────────────
export function SearchWidget({
  mode = "navigate",
  defaultTab = "packages",
  hideTabs = false,
  defaultActiveField = null,
  destinations = [],
  onFilter,
  onClose,
}: {
  mode?: "navigate" | "filter";
  defaultTab?: "packages" | "hotels" | "grouptours";
  hideTabs?: boolean;
  defaultActiveField?: ActiveField;
  destinations?: DestinationOption[];
  onFilter?: (params: Record<string, string>) => void;
  onClose?: () => void;
} = {}) {
  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [activeField, setActiveField] = useState<ActiveField>(defaultActiveField);
  const [selectedDest, setSelectedDest] = useState<string | null>(null);

  // Sync when NavSearchBar switches tabs — keeps destination value, resets open dropdown
  useEffect(() => {
    setActiveTab(defaultTab);
    setActiveField(defaultActiveField ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultTab]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [travelers, setTravelers] = useState({ adults: 2, children: 0, infants: 0 });
  const [destSearch, setDestSearch] = useState("");
  const widgetRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname() ?? "";

  // Restore previous search state from sessionStorage on mount (navigate/home mode always starts fresh)
  useEffect(() => {
    if (mode === "navigate") return;
    try {
      const raw = sessionStorage.getItem("tp_search");
      if (!raw) return;
      const s = JSON.parse(raw) as {
        activeTab?: TabId;
        selectedDest?: string;
        startDate?: string;
        endDate?: string;
        travelers?: { adults: number; children: number; infants: number };
      };
      if (s.activeTab) setActiveTab(s.activeTab);
      if (s.selectedDest) {
        setSelectedDest(s.selectedDest);
        const name = destinations.find((d) => d.slug === s.selectedDest)?.name;
        if (name) setDestSearch(name);
      }
      if (s.startDate) setStartDate(new Date(s.startDate));
      if (s.endDate) setEndDate(new Date(s.endDate));
      if (s.travelers) setTravelers(s.travelers);
    } catch { /* ignore */ }
  }, []);

  // Persist search state to sessionStorage whenever it changes
  useEffect(() => {
    try {
      sessionStorage.setItem("tp_search", JSON.stringify({
        activeTab,
        selectedDest,
        startDate: startDate?.toISOString() ?? null,
        endDate: endDate?.toISOString() ?? null,
        travelers,
      }));
    } catch { /* ignore */ }
  }, [activeTab, selectedDest, startDate, endDate, travelers]);

  // Mark widget as opened the first time the user clicks any field
  useEffect(() => {
    if (activeField !== null) {
      try { sessionStorage.setItem("tp_search_opened", "1"); } catch { /* ignore */ }
    }
  }, [activeField]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) {
        setActiveField(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isDestSearchPrefilled = !!selectedDest && destSearch === (destinations.find((d) => d.slug === selectedDest)?.name ?? "");

  // Typing over a prefilled destination must invalidate the prior selection,
  // otherwise Search re-submits the stale slug and the page appears "stuck".
  const handleDestSearchChange = (value: string) => {
    setDestSearch(value);
    if (selectedDest) {
      const prefilled = destinations.find((d) => d.slug === selectedDest)?.name ?? "";
      if (value !== prefilled) setSelectedDest(null);
    }
  };
  const PINNED = ["hunza", "skardu", "chitral", "naran", "kumrat", "lahore"];
  const parentDests = destinations
    .filter((d) => !d.parentSlug)
    .sort((a, b) => {
      const ai = PINNED.indexOf(a.slug);
      const bi = PINNED.indexOf(b.slug);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
  const filteredDests = !destSearch || isDestSearchPrefilled
    ? parentDests
    : destinations
        .filter(
          (d) =>
            d.name.toLowerCase().includes(destSearch.toLowerCase()) ||
            d.region.toLowerCase().includes(destSearch.toLowerCase())
        )
        .sort((a, b) => {
          const q = destSearch.toLowerCase();
          const aStarts = a.name.toLowerCase().startsWith(q);
          const bStarts = b.name.toLowerCase().startsWith(q);
          if (aStarts !== bStarts) return aStarts ? -1 : 1;
          const aParent = !a.parentSlug;
          const bParent = !b.parentSlug;
          if (aParent !== bParent) return aParent ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

  const selectedDestName = destinations.find((d) => d.slug === selectedDest)?.name;
  const totalTravelers = travelers.adults + travelers.children + travelers.infants;
  const isHotels = activeTab === "hotels";

  // Format date label
  function fmtDate(d: Date | null) {
    if (!d) return undefined;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function fmtDateRange(start: Date | null, end: Date | null): string | undefined {
    if (!start) return undefined;
    const s = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!end) return s;
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${s} – ${end.getDate()}`;
    }
    return `${s} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
  }

  function handleCalendarSelect(date: Date) {
    // Clear signal
    if (date.getTime() === 0) { setStartDate(null); setEndDate(null); return; }

    if (!isHotels) {
      // Single date for tours/customise
      setStartDate(date);
      setEndDate(null);
      setActiveField(activeTab === "grouptours" ? "groupsize" : "travelers");
      return;
    }

    // Range mode for hotels
    if (!startDate || (startDate && endDate)) {
      setStartDate(date); setEndDate(null);
    } else {
      if (date < startDate) { setStartDate(date); setEndDate(null); }
      else { setEndDate(date); setActiveField("guests"); }
    }
  }

  // Disable Search until the user has committed to *something*. Otherwise the
  // button silently fires a no-op navigation, which feels broken.
  const canSearch = !!selectedDest || !!destSearch.trim() || !!startDate;

  const handleSearch = () => {
    // Auto-pick the top filtered destination if the user typed but never
    // clicked a dropdown option — matches Google-style "Enter on top result".
    let effectiveDest = selectedDest;
    if (!effectiveDest && destSearch.trim() && filteredDests.length > 0) {
      effectiveDest = filteredDests[0].slug;
      setSelectedDest(effectiveDest);
      setDestSearch(filteredDests[0].name);
    }

    const params = new URLSearchParams();
    if (effectiveDest) {
      // Keep the exact slug the user picked. Each listing page resolves
      // sub → parent itself so it can rank exact matches above siblings.
      params.set("destination", effectiveDest);
    }
    if (startDate) params.set("checkin", startDate.toISOString().split("T")[0]);
    if (endDate) params.set("checkout", endDate.toISOString().split("T")[0]);
    params.set("guests", String(Math.max(1, travelers.adults + travelers.children)));

    if (mode === "filter") {
      const tabPath = activeTab === "hotels" ? "/hotels" : activeTab === "grouptours" ? "/grouptours" : "/packages";
      const target = `${tabPath}${params.toString() ? `?${params.toString()}` : ""}`;
      // Temporary: diagnose intermittent "URL doesn't update" reports on hotels.
      // Safe to remove once the cause is pinned down.
      console.log("[search] submit", { activeTab, selectedDest, destSearch, effectiveDest, target });
      router.push(target);
      onFilter?.({
        destination: effectiveDest ?? "",
        checkin: startDate?.toISOString().split("T")[0] ?? "",
        checkout: endDate?.toISOString().split("T")[0] ?? "",
        guests: String(travelers.adults + travelers.children),
      });
    } else {
      const basePath = activeTab === "packages" ? "/packages" : activeTab === "hotels" ? "/hotels" : "/grouptours";
      router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
    }
    setActiveField(null);
    onClose?.();
  };

  const instanceId = useId();

  const isCalendarField = (f: ActiveField) =>
    f === "when" || f === "month" || f === "checkin" || f === "checkout";

  return (
    <LayoutGroup id={instanceId}>
    <div className="w-full max-w-[960px] mx-auto" ref={widgetRef}>
      {/* Tabs */}
      {!hideTabs && <div className="flex justify-center gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => { setActiveTab(tab.id); setActiveField("destination"); }}
            className={cn(
              "px-5 py-2.5 text-[14px] font-semibold rounded-[var(--radius-full)] transition-all duration-200 cursor-pointer",
              activeTab === tab.id
                ? "bg-[var(--bg-primary)] text-[var(--text-primary)]"
                : mode === "filter"
                  ? "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                  : "bg-[var(--on-dark-glass-hover)] text-[var(--on-dark)] hover:bg-[var(--on-dark-glass-hover)]"
            )}
            style={activeTab === tab.id ? { boxShadow: "var(--shadow-sm)" } : undefined}
          >
            {tab.label}
          </button>
        ))}
      </div>}

      {/* Search Bar */}
      <div className="relative">
        <div
          className={cn(
            "rounded-[var(--radius-full)]",
            mode === "filter"
              ? "bg-[var(--bg-subtle)] h-[66px] grid grid-cols-[1fr_1px_1fr_1px_1fr]"
              : "bg-[var(--bg-subtle)] h-[66px] flex items-stretch overflow-hidden"
          )}
          style={mode !== "filter" ? { boxShadow: "0 8px 40px rgba(0,0,0,0.25)" } : undefined}
        >
          {/* Customise Tab */}
          {activeTab === "packages" && (
            <>
              <DestinationField value={selectedDestName} active={activeField === "destination"}
                destSearch={destSearch} onDestSearchChange={handleDestSearchChange} className={mode === "navigate" ? "w-[295px] shrink-0" : "flex-1"}
                onActivate={() => setActiveField(activeField === "destination" ? null : "destination")}
                onClear={() => { setSelectedDest(null); setDestSearch(""); setActiveField("destination"); }} />
              <Divider className={mode === "navigate" ? "mx-1" : ""} faded={activeField === "destination" || activeField === "when"} />
              <FieldButton label="When" value={fmtDate(startDate)} placeholder="Add dates"
                active={activeField === "when"} className={mode === "navigate" ? "w-[300px] shrink-0" : "flex-1"}
                onClick={() => setActiveField(activeField === "when" ? null : "when")}
                onClear={() => { setStartDate(null); setEndDate(null); }} />
              <Divider className={mode === "navigate" ? "mx-1" : ""} faded={activeField === "when" || activeField === "travelers"} />
              <div className={cn("relative flex items-center rounded-[var(--radius-full)]", mode === "navigate" ? "w-[295px] shrink-0" : "flex-1")}>
                {activeField === "travelers" && (
                  <motion.div layoutId="segment-bg" className={cn("absolute inset-y-0 left-0 rounded-full bg-[var(--bg-primary)]", mode === "navigate" ? "-right-[60px]" : "right-0")} style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.1)" }} transition={SEGMENT_SPRING} />
                )}
                <FieldButton label="Who"
                  value={totalTravelers > 0 ? `${totalTravelers} guest${totalTravelers > 1 ? "s" : ""}` : undefined}
                  placeholder="Add guests" active={activeField === "travelers"} className="relative z-10 flex-1" noActiveBg
                  onClick={() => setActiveField(activeField === "travelers" ? null : "travelers")}
                  onClear={() => setTravelers({ adults: 0, children: 0, infants: 0 })} />
                <button type="button" onClick={handleSearch} disabled={!canSearch}
                  className={cn(
                    "relative z-10 shrink-0 bg-[var(--primary)] rounded-full flex items-center justify-center text-[var(--text-inverse)] active:scale-95 transition-all duration-200",
                    canSearch ? "cursor-pointer hover:bg-[var(--primary-hover)]" : "cursor-not-allowed opacity-50",
                    mode === "filter" ? "gap-1.5 px-4 h-12 self-center mr-1.5" : "self-center w-14 h-14 mr-2"
                  )}
                  style={{ boxShadow: "var(--shadow-sm)" }} aria-label="Search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {mode === "filter" && <span className="text-[13px] font-semibold">Search</span>}
                </button>
              </div>
            </>
          )}

          {/* Group Tours Tab */}
          {activeTab === "grouptours" && (
            <>
              <DestinationField value={selectedDestName} active={activeField === "destination"}
                destSearch={destSearch} onDestSearchChange={handleDestSearchChange} className={mode === "navigate" ? "w-[295px] shrink-0" : "flex-1"}
                onActivate={() => setActiveField(activeField === "destination" ? null : "destination")}
                onClear={() => { setSelectedDest(null); setDestSearch(""); setActiveField("destination"); }} />
              <Divider className={mode === "navigate" ? "mx-1" : ""} faded={activeField === "destination" || activeField === "month"} />
              <FieldButton label="When" value={fmtDate(startDate)} placeholder="Add dates"
                active={activeField === "month"} className={mode === "navigate" ? "w-[300px] shrink-0" : "flex-1"}
                onClick={() => setActiveField(activeField === "month" ? null : "month")}
                onClear={() => { setStartDate(null); setEndDate(null); }} />
              <Divider className={mode === "navigate" ? "mx-1" : ""} faded={activeField === "month" || activeField === "groupsize"} />
              <div className={cn("relative flex items-center rounded-[var(--radius-full)]", mode === "navigate" ? "w-[295px] shrink-0" : "flex-1")}>
                {activeField === "groupsize" && (
                  <motion.div layoutId="segment-bg" className={cn("absolute inset-y-0 left-0 rounded-full bg-[var(--bg-primary)]", mode === "navigate" ? "-right-[60px]" : "right-0")} style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.1)" }} transition={SEGMENT_SPRING} />
                )}
                <FieldButton label="Who"
                  value={totalTravelers > 0 ? `${totalTravelers} guest${totalTravelers > 1 ? "s" : ""}` : undefined}
                  placeholder="Add guests" active={activeField === "groupsize"} className="relative z-10 flex-1" noActiveBg
                  onClick={() => setActiveField(activeField === "groupsize" ? null : "groupsize")}
                  onClear={() => setTravelers({ adults: 0, children: 0, infants: 0 })} />
                <button type="button" onClick={handleSearch} disabled={!canSearch}
                  className={cn(
                    "relative z-10 shrink-0 bg-[var(--primary)] rounded-full flex items-center justify-center text-[var(--text-inverse)] active:scale-95 transition-all duration-200",
                    canSearch ? "cursor-pointer hover:bg-[var(--primary-hover)]" : "cursor-not-allowed opacity-50",
                    mode === "filter" ? "gap-1.5 px-4 h-12 self-center mr-1.5" : "self-center w-14 h-14 mr-2"
                  )}
                  style={{ boxShadow: "var(--shadow-sm)" }} aria-label="Search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {mode === "filter" && <span className="text-[13px] font-semibold">Search</span>}
                </button>
              </div>
            </>
          )}

          {/* Hotels Tab */}
          {activeTab === "hotels" && (
            <>
              <DestinationField value={selectedDestName} active={activeField === "destination"}
                destSearch={destSearch} onDestSearchChange={handleDestSearchChange} className={mode === "navigate" ? "w-[295px] shrink-0" : "flex-1"}
                onActivate={() => setActiveField(activeField === "destination" ? null : "destination")}
                onClear={() => { setSelectedDest(null); setDestSearch(""); setActiveField("destination"); }} />
              <Divider className={mode === "navigate" ? "mx-1" : ""} faded={activeField === "destination" || activeField === "checkin" || activeField === "checkout"} />
              <FieldButton label="When" value={fmtDateRange(startDate, endDate)} placeholder="Add dates"
                active={activeField === "checkin" || activeField === "checkout"} className={mode === "navigate" ? "w-[300px] shrink-0" : "flex-1"}
                onClick={() => setActiveField(activeField === "checkin" || activeField === "checkout" ? null : "checkin")}
                onClear={() => { setStartDate(null); setEndDate(null); }} />
              <Divider className={mode === "navigate" ? "mx-1" : ""} faded={activeField === "checkin" || activeField === "checkout" || activeField === "guests"} />
              <div className={cn("relative flex items-center rounded-[var(--radius-full)]", mode === "navigate" ? "w-[295px] shrink-0" : "flex-1")}>
                {activeField === "guests" && (
                  <motion.div layoutId="segment-bg" className={cn("absolute inset-y-0 left-0 rounded-full bg-[var(--bg-primary)]", mode === "navigate" ? "-right-[60px]" : "right-0")} style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.1)" }} transition={SEGMENT_SPRING} />
                )}
                <FieldButton label="Who"
                  value={totalTravelers > 0 ? `${totalTravelers} guest${totalTravelers > 1 ? "s" : ""}` : undefined}
                  placeholder="Add guests" active={activeField === "guests"} className="relative z-10 flex-1" noActiveBg
                  onClick={() => setActiveField(activeField === "guests" ? null : "guests")}
                  onClear={() => setTravelers({ adults: 0, children: 0, infants: 0 })} />
                <button type="button" onClick={handleSearch} disabled={!canSearch}
                  className={cn(
                    "relative z-10 shrink-0 bg-[var(--primary)] rounded-full flex items-center justify-center text-[var(--text-inverse)] active:scale-95 transition-all duration-200",
                    canSearch ? "cursor-pointer hover:bg-[var(--primary-hover)]" : "cursor-not-allowed opacity-50",
                    mode === "filter" ? "gap-1.5 px-4 h-12 self-center mr-1.5" : "self-center w-14 h-14 mr-2"
                  )}
                  style={{ boxShadow: "var(--shadow-sm)" }} aria-label="Search">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  {mode === "filter" && <span className="text-[13px] font-semibold">Search</span>}
                </button>
              </div>
            </>
          )}


        </div>

        <AnimatePresence>
        {/* Destination dropdown */}
        {activeField === "destination" && (
          <DropdownPanel key="dest" className="left-0 w-full sm:w-[460px]">

            <div className="max-h-[400px] overflow-y-auto py-2">
              {filteredDests.length === 0 && (
                <p className="px-5 py-6 text-center text-[14px] text-[var(--text-tertiary)]">No destinations found</p>
              )}
              {filteredDests.map((dest) => (
                <button key={dest.slug} type="button"
                  onClick={() => { setSelectedDest(dest.slug); setDestSearch(""); setActiveField(activeTab === "hotels" ? "checkin" : activeTab === "grouptours" ? "month" : "when"); }}
                  className={cn(
                    "w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer",
                    selectedDest === dest.slug && "bg-[var(--primary-light)]"
                  )}>
                  <span className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <div className={mode === "navigate" ? "w-[295px] shrink-0" : "flex-1"}>
                    <p className="text-[15px] font-semibold text-[var(--text-primary)]">{dest.name}</p>
                    <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{dest.region}</p>
                  </div>
                  {selectedDest === dest.slug && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </DropdownPanel>
        )}

        {/* Experiences/Tours calendar (single month + shortcuts) */}
        {isCalendarField(activeField) && !isHotels && (
          <DropdownPanel key="cal-tours" className="left-1/2 w-[340px] sm:w-[640px]" centerX>
            <CalendarPanel
              rangeMode={false}
              startDate={startDate}
              endDate={endDate}
              onSelect={handleCalendarSelect}
            />
          </DropdownPanel>
        )}

        {/* Stays calendar (two months, Airbnb Stays style) */}
        {isCalendarField(activeField) && isHotels && (
          <DropdownPanel key="cal-hotels" className="left-1/2 w-[340px] sm:w-[850px]" centerX>
            <StaysCalendarPanel
              startDate={startDate}
              endDate={endDate}
              onSelect={handleCalendarSelect}
              onFlexSelect={(start, end) => {
                setStartDate(start);
                setEndDate(end);
                setActiveField("guests");
              }}
            />
          </DropdownPanel>
        )}

        {/* Travelers / Group size / Guests dropdown */}
        {(activeField === "travelers" || activeField === "groupsize" || activeField === "guests") && (
          <DropdownPanel key="who" className="right-0 w-[370px]">
            <div className="px-6 pt-6 pb-4 divide-y divide-[var(--border-default)]">
              <div className="flex items-center justify-between pb-5">
                <div>
                  <p className="text-[16px] font-semibold text-[var(--text-primary)]">Adults</p>
                  <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">Ages 13+</p>
                </div>
                <div className="flex items-center gap-3">
                  <StepperButton onClick={() => setTravelers((p) => ({ ...p, adults: Math.max(1, p.adults - 1) }))} disabled={travelers.adults <= 1}>−</StepperButton>
                  <span className="w-8 text-center text-[16px] font-semibold tabular-nums">{travelers.adults}</span>
                  <StepperButton onClick={() => setTravelers((p) => ({ ...p, adults: Math.min(20, p.adults + 1) }))}>+</StepperButton>
                </div>
              </div>
              <div className="flex items-center justify-between py-5">
                <div>
                  <p className="text-[16px] font-semibold text-[var(--text-primary)]">Children</p>
                  <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">Ages 2–12</p>
                </div>
                <div className="flex items-center gap-3">
                  <StepperButton onClick={() => setTravelers((p) => ({ ...p, children: Math.max(0, p.children - 1) }))} disabled={travelers.children <= 0}>−</StepperButton>
                  <span className="w-8 text-center text-[16px] font-semibold tabular-nums">{travelers.children}</span>
                  <StepperButton onClick={() => setTravelers((p) => ({ ...p, children: p.children + 1 }))}>+</StepperButton>
                </div>
              </div>
              {!isHotels && (
                <div className="flex items-center justify-between py-5">
                  <div>
                    <p className="text-[16px] font-semibold text-[var(--text-primary)]">Infants</p>
                    <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">Under 2</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StepperButton onClick={() => setTravelers((p) => ({ ...p, infants: Math.max(0, p.infants - 1) }))} disabled={travelers.infants <= 0}>−</StepperButton>
                    <span className="w-8 text-center text-[16px] font-semibold tabular-nums">{travelers.infants}</span>
                    <StepperButton onClick={() => setTravelers((p) => ({ ...p, infants: p.infants + 1 }))}>+</StepperButton>
                  </div>
                </div>
              )}
              <div className="pt-4 flex items-center justify-between">
                <span className="text-[14px] text-[var(--text-tertiary)]">{totalTravelers} traveler{totalTravelers !== 1 ? "s" : ""} total</span>
                <button type="button" onClick={() => setActiveField(null)}
                  className="text-[14px] font-semibold text-[var(--primary)] hover:underline cursor-pointer">Done</button>
              </div>
            </div>
          </DropdownPanel>
        )}
        </AnimatePresence>
      </div>
    </div>
    </LayoutGroup>
  );
}

/* ── Sub-components ── */
function FieldButton({ label, value, placeholder, active, onClick, onClear, className, noActiveBg }: {
  label: string; value?: string; placeholder: string; active: boolean; onClick: () => void; onClear?: () => void; className?: string; noActiveBg?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center gap-2 px-4 sm:px-6 rounded-[var(--radius-full)] cursor-pointer text-left",
        className
      )}
      onClick={onClick}
    >
      {active && !noActiveBg && (
        <motion.div
          layoutId="segment-bg"
          className="absolute inset-0 rounded-full bg-[var(--bg-primary)]" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.1)" }}
          transition={SEGMENT_SPRING}
        />
      )}
      <div className="relative z-10 flex flex-col min-w-0 flex-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{label}</span>
        <span className={cn("text-[13px] truncate", value ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]")}>
          {value || placeholder}
        </span>
      </div>
      {value && onClear && active && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="relative z-10 shrink-0 w-6 h-6 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Clear dates"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

function DropdownPanel({ children, className, centerX = false }: { children: React.ReactNode; className?: string; centerX?: boolean }) {
  const x = centerX ? "-50%" : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98, x }}
      animate={{ opacity: 1, y: 0, scale: 1, x, transition: DROP_SPRING }}
      exit={{ opacity: 0, y: -4, scale: 0.99, x, transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] } }}
      className={cn(
        "absolute top-full mt-3 bg-[var(--bg-primary)] rounded-[var(--radius-md)] border border-[var(--border-default)] z-50 overflow-hidden",
        className
      )}
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      {children}
    </motion.div>
  );
}

function StepperButton({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean; }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn(
        "w-7 h-7 border border-[var(--border-default)] rounded-full flex items-center justify-center leading-none",
        "text-[14px] font-medium text-[var(--text-secondary)] cursor-pointer",
        "hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors",
        "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-[var(--border-default)] disabled:hover:text-[var(--text-secondary)]"
      )}>
      {children}
    </button>
  );
}

function DestinationField({ value, active, destSearch, onDestSearchChange, onActivate, onClear, className }: {
  value?: string; active: boolean; destSearch: string;
  onDestSearchChange: (v: string) => void; onActivate: () => void; onClear?: () => void; className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (active) { setTimeout(() => inputRef.current?.focus(), 0); } }, [active]);
  return (
    <div
      onClick={onActivate}
      className={cn(
        "relative flex items-center gap-2 pl-4 sm:pl-8 pr-4 sm:pr-6 rounded-[var(--radius-full)] cursor-pointer text-left min-w-0",
        className
      )}
    >
      {active && (
        <motion.div
          layoutId="segment-bg"
          className="absolute inset-0 rounded-full bg-[var(--bg-primary)]" style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.1)" }}
          transition={SEGMENT_SPRING}
        />
      )}
      <div className="relative z-10 flex flex-col min-w-0 flex-1">
        <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Where</span>
        {active ? (
          <input
            ref={inputRef}
            type="text"
            value={destSearch}
            onChange={(e) => onDestSearchChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            placeholder="Search destinations"
            className="text-[13px] text-[var(--text-primary)] bg-transparent placeholder:text-[var(--text-tertiary)] w-full min-w-0"
            style={{ outline: "none", boxShadow: "none", border: "none" }}
          />
        ) : (
          <span className={cn("text-[13px] truncate", value ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-tertiary)]")}>
            {value || "Search destinations"}
          </span>
        )}
      </div>
      {value && onClear && active && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          className="relative z-10 shrink-0 w-6 h-6 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Clear destination"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
}

function Divider({ className, faded }: { className?: string; faded?: boolean }) {
  return (
    <div className={cn(
      "w-px h-6 bg-[var(--border-default)]/60 shrink-0 self-center transition-opacity duration-200",
      faded && "opacity-0",
      className
    )} />
  );
}
