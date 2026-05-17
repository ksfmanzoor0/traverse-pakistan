"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { type DestinationOption } from "@/components/home/SearchWidget";

const TABS = [
  { id: "packages", label: "Custom Tours" },
  { id: "hotels", label: "Hotels" },
  { id: "grouptours", label: "Group Tours" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isInRange(d: Date, start: Date | null, end: Date | null) {
  if (!start || !end) return false;
  return d.getTime() > start.getTime() && d.getTime() < end.getTime();
}

function fmtDate(d: Date | null): string | null {
  if (!d) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function fmtDateRange(start: Date | null, end: Date | null): string | null {
  if (!start) return null;
  const s = fmtDate(start)!;
  if (!end) return s;
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${s} – ${end.getDate()}`;
  }
  return `${s} – ${fmtDate(end)}`;
}

// ── Mobile Calendar (single-date for tours) ──────────────────────────────────
const MONTHS_STEP = 3;
const MONTHS_MAX = 12;

function MobileCalendarPanel({
  startDate,
  onSelect,
}: {
  startDate: Date | null;
  onSelect: (date: Date) => void;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [visibleMonths, setVisibleMonths] = useState(MONTHS_STEP);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const wkStart = new Date(today); wkStart.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7 || 7));
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkStart.getDate() + 1);

  const shortcuts = [
    { label: "Today", sub: fmtDate(today)!, date: today },
    { label: "Tomorrow", sub: fmtDate(tomorrow)!, date: tomorrow },
    { label: "This weekend", sub: `${fmtDate(wkStart)} – ${fmtDate(wkEnd)}`, date: wkStart },
  ];

  const months = Array.from({ length: visibleMonths }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div className="px-4 pt-4 pb-2">
      {/* Shortcut chips */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {shortcuts.map(s => {
          const active = startDate ? isSameDay(startDate, s.date) : false;
          return (
            <button key={s.label} type="button" onClick={() => onSelect(s.date)}
              className={cn(
                "shrink-0 flex flex-col items-start px-4 py-3 rounded-[var(--radius-md)] border text-left transition-all cursor-pointer",
                active ? "border-[var(--text-primary)] bg-[var(--bg-subtle)]" : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
              )}>
              <span className="text-[14px] font-semibold text-[var(--text-primary)]">{s.label}</span>
              <span className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{s.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Scrolling months */}
      {months.map(({ year, month }) => {
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const cells: (Date | null)[] = Array(firstDay).fill(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
        while (cells.length % 7 !== 0) cells.push(null);

        return (
          <div key={`${year}-${month}`} className="mb-6">
            <p className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">{MONTH_NAMES[month]} {year}</p>
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map((d, i) => (
                <div key={i} className="text-center text-[12px] font-semibold text-[var(--text-tertiary)] py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {cells.map((date, i) => {
                if (!date) return <div key={i} className="h-11" />;
                const isPast = date < today;
                const isSelected = startDate ? isSameDay(date, startDate) : false;
                const isToday = isSameDay(date, today);
                return (
                  <div key={i} className="flex items-center justify-center h-11">
                    <button type="button" disabled={isPast} onClick={() => onSelect(date)}
                      className={cn(
                        "w-11 h-11 rounded-full text-[15px] font-medium transition-all cursor-pointer select-none",
                        isPast && "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed",
                        !isPast && !isSelected && "hover:bg-[var(--bg-elevated)] text-[var(--text-primary)]",
                        isToday && !isSelected && !isPast && "font-bold",
                        isSelected && "bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold",
                      )}>
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Load more */}
      {visibleMonths < MONTHS_MAX && (
        <button type="button" onClick={() => setVisibleMonths(m => Math.min(m + MONTHS_STEP, MONTHS_MAX))}
          className="w-full py-4 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[15px] font-semibold text-[var(--text-primary)] transition-colors cursor-pointer mb-2">
          Load more dates
        </button>
      )}
      {/* Clear */}
      {startDate && (
        <div className="pt-2 pb-2">
          <button type="button" onClick={() => onSelect(new Date(0))}
            className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--primary)] underline cursor-pointer">
            Clear date
          </button>
        </div>
      )}
    </div>
  );
}

// ── Mobile Stays Calendar (date range for hotels) ────────────────────────────
const FLEX_OPTIONS = [
  { label: "Exact dates", value: "exact" },
  { label: "± 1 day", value: "1" },
  { label: "± 2 days", value: "2" },
  { label: "± 3 days", value: "3" },
  { label: "± 7 days", value: "7" },
  { label: "± 14 days", value: "14" },
];

function MobileStaysCalendar({
  startDate,
  endDate,
  onSelect,
  onAdvance,
  mode,
  onModeChange,
  flexDuration,
  onFlexDurationChange,
  flexMonth,
  onFlexMonthChange,
}: {
  startDate: Date | null;
  endDate: Date | null;
  onSelect: (date: Date) => void;
  onAdvance: () => void;
  mode: "dates" | "flexible";
  onModeChange: (m: "dates" | "flexible") => void;
  flexDuration: "weekend" | "week" | "month";
  onFlexDurationChange: (d: "weekend" | "week" | "month") => void;
  flexMonth: number | null;
  onFlexMonthChange: (m: number | null) => void;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [visibleMonths, setVisibleMonths] = useState(MONTHS_STEP);
  const [flexibility, setFlexibility] = useState("exact");

  const effectiveEnd = startDate && !endDate && hovered ? (hovered >= startDate ? hovered : startDate) : endDate;
  const effectiveStart = startDate && !endDate && hovered && hovered < startDate ? hovered : startDate;

  const months = Array.from({ length: visibleMonths }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const nights = startDate && endDate
    ? Math.round((endDate.getTime() - startDate.getTime()) / 86400000) : 0;

  const upcomingMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Dates / Flexible toggle — pinned top */}
      <div className="shrink-0 flex justify-center pt-3 pb-3 border-b border-[var(--border-default)]">
        <div className="flex items-center bg-[var(--bg-subtle)] rounded-full p-1">
          <button type="button" onClick={() => onModeChange("dates")}
            className={cn(
              "px-6 py-2 rounded-full text-[14px] font-semibold transition-all cursor-pointer",
              mode === "dates"
                ? "bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            )}>
            Dates
          </button>
          <button type="button" onClick={() => onModeChange("flexible")}
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

      {/* Flexible mode UI */}
      {mode === "flexible" && (
        <div className="flex-1 overflow-y-auto px-4 pt-5 pb-4">
          <p className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">How long would you like to stay?</p>
          <div className="flex gap-2 mb-6">
            {(["weekend", "week", "month"] as const).map(d => (
              <button key={d} type="button" onClick={() => onFlexDurationChange(d)}
                className={cn(
                  "h-10 px-5 rounded-full text-[14px] font-medium border transition-all cursor-pointer capitalize",
                  flexDuration === d
                    ? "border-[var(--text-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                )}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>

          <div className="h-px bg-[var(--border-default)] mb-5" />

          <p className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">Go anytime</p>
          <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
            {upcomingMonths.map(({ year, month }) => (
              <button key={`${year}-${month}`} type="button"
                onClick={() => {
                  const alreadySelected = flexMonth === month && upcomingMonths.find(m => m.month === month)?.year === year;
                  onFlexMonthChange(alreadySelected ? null : month);
                  if (!alreadySelected) onAdvance();
                }}
                className={cn(
                  "shrink-0 w-[120px] flex flex-col items-center gap-2 p-4 rounded-[var(--radius-md)] border transition-all cursor-pointer",
                  flexMonth === month
                    ? "border-[var(--text-primary)] bg-[var(--bg-subtle)]"
                    : "border-[var(--border-default)] hover:border-[var(--border-strong)]"
                )}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                <div className="text-center">
                  <p className="text-[15px] font-semibold text-[var(--text-primary)]">{MONTH_NAMES[month]}</p>
                  <p className="text-[13px] text-[var(--text-tertiary)]">{year}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Scrolling months — fills remaining height (dates mode only) */}
      {mode === "dates" && <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {months.map(({ year, month }) => {
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const cells: (Date | null)[] = Array(firstDay).fill(null);
          for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
          while (cells.length % 7 !== 0) cells.push(null);

          return (
            <div key={`${year}-${month}`} className="mb-6">
              <p className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">{MONTH_NAMES[month]} {year}</p>
              <div className="grid grid-cols-7 mb-1">
                {DAYS.map((d, i) => (
                  <div key={i} className="text-center text-[12px] font-semibold text-[var(--text-tertiary)] py-1">{d}</div>
                ))}
              </div>
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
                          "relative z-10 w-11 h-11 rounded-full text-[15px] font-medium transition-all cursor-pointer select-none",
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
        })}

        {/* Load more */}
        {visibleMonths < MONTHS_MAX && (
          <button type="button" onClick={() => setVisibleMonths(m => Math.min(m + MONTHS_STEP, MONTHS_MAX))}
            className="w-full py-4 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] text-[15px] font-semibold text-[var(--text-primary)] transition-colors cursor-pointer mb-2">
            Load more dates
          </button>
        )}
      </div>}

      {/* Flexibility pills — pinned bottom, horizontal scroll (dates mode only) */}
      {mode === "dates" && (
        <div className="shrink-0 border-t border-[var(--border-default)] px-4 py-3">
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {FLEX_OPTIONS.map(opt => (
              <button key={opt.value} type="button" onClick={() => setFlexibility(opt.value)}
                className={cn(
                  "shrink-0 h-9 px-4 rounded-full text-[13px] font-medium border transition-all cursor-pointer",
                  flexibility === opt.value
                    ? "border-[var(--text-primary)] bg-[var(--bg-subtle)] text-[var(--text-primary)] font-semibold"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                )}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear + nights — pinned bottom (dates mode only) */}
      {mode === "dates" && (
        <div className="shrink-0 px-4 pb-3 flex items-center justify-between">
          {startDate ? (
            <button type="button" onClick={() => onSelect(new Date(0))}
              className="text-[13px] font-semibold text-[var(--text-primary)] underline hover:text-[var(--primary)] cursor-pointer">
              Clear dates
            </button>
          ) : <div />}
          {startDate && endDate && (
            <p className="text-[13px] text-[var(--text-tertiary)]">
              {nights} night{nights !== 1 ? "s" : ""}
              {flexibility !== "exact" ? ` ± ${flexibility} day${flexibility !== "1" ? "s" : ""}` : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main overlay ─────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  destinations: DestinationOption[];
  defaultTab?: TabId;
}

export function MobileSearchOverlay({ open, onClose, destinations, defaultTab = "packages" }: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [activeSection, setActiveSection] = useState<"where" | "when" | "who" | null>("where");
  const [destSearch, setDestSearch] = useState("");
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [travelers, setTravelers] = useState({ adults: 2, children: 0, infants: 0 });
  // Stays flexible mode state (lifted from MobileStaysCalendar)
  const [staysMode, setStaysMode] = useState<"dates" | "flexible">("dates");
  const [flexDuration, setFlexDuration] = useState<"weekend" | "week" | "month">("week");
  const [flexMonth, setFlexMonth] = useState<number | null>(null);

  const isHotels = activeTab === "hotels";
  const totalTravelers = travelers.adults + travelers.children + travelers.infants;

  // On open: always use defaultTab, restore other fields from sessionStorage
  useEffect(() => {
    if (!open) return;
    setActiveTab(defaultTab);
    try { sessionStorage.setItem("tp_search_opened", "1"); } catch { /* ignore */ }
    try {
      const raw = sessionStorage.getItem("tp_search");
      if (!raw) return;
      const s = JSON.parse(raw) as {
        selectedDest?: string;
        startDate?: string;
        endDate?: string;
        travelers?: { adults: number; children: number; infants: number };
      };
      if (s.selectedDest) {
        setSelectedDest(s.selectedDest);
        const name = destinations.find(d => d.slug === s.selectedDest)?.name;
        if (name) setDestSearch(name);
      }
      if (s.startDate) setStartDate(new Date(s.startDate));
      if (s.endDate) setEndDate(new Date(s.endDate));
      if (s.travelers) setTravelers(s.travelers);
    } catch { /* ignore */ }
  }, [open, defaultTab, destinations]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Reset UI section on tab change — dates, destination and travelers persist
  useEffect(() => {
    setActiveSection("where");
  }, [activeTab]);

  // Mirror desktop onFlexSelect: set real startDate/endDate as soon as both duration + month are chosen
  useEffect(() => {
    if (!isHotels || staysMode !== "flexible") { return; }
    if (flexMonth === null) { setStartDate(null); setEndDate(null); return; }
    const today = new Date();
    const yr = flexMonth < today.getMonth() ? today.getFullYear() + 1 : today.getFullYear();
    const start = new Date(yr, flexMonth, 1);
    let end: Date;
    if (flexDuration === "weekend") { end = new Date(yr, flexMonth, 3); }
    else if (flexDuration === "week") { end = new Date(yr, flexMonth, 8); }
    else { end = new Date(yr, flexMonth + 1, 0); }
    setStartDate(start);
    setEndDate(end);
  }, [isHotels, staysMode, flexDuration, flexMonth]);

  const isDestSearchPrefilled = !!selectedDest && destSearch === (destinations.find(d => d.slug === selectedDest)?.name ?? "");
  const PINNED = ["hunza", "skardu", "chitral", "naran", "kumrat", "lahore"];
  const parentDests = destinations
    .filter(d => !d.parentSlug)
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
        .filter(d =>
          d.name.toLowerCase().includes(destSearch.toLowerCase()) ||
          d.region.toLowerCase().includes(destSearch.toLowerCase())
        )
        .sort((a, b) => {
          const q = destSearch.toLowerCase();
          const aStarts = a.name.toLowerCase().startsWith(q);
          const bStarts = b.name.toLowerCase().startsWith(q);
          if (aStarts !== bStarts) return aStarts ? -1 : 1;
          return (!a.parentSlug ? -1 : 1) - (!b.parentSlug ? -1 : 1) || a.name.localeCompare(b.name);
        });

  function handleCalendarSelect(date: Date) {
    if (date.getTime() === 0) { setStartDate(null); setEndDate(null); return; }
    if (!isHotels) {
      setStartDate(date); setEndDate(null);
      setActiveSection("who");
      return;
    }
    if (!startDate || (startDate && endDate)) {
      setStartDate(date); setEndDate(null);
    } else {
      if (date < startDate) { setStartDate(date); setEndDate(null); }
      else { setEndDate(date); setActiveSection("who"); }
    }
  }

  function handleSearch() {
    const params = new URLSearchParams();
    if (selectedDest) {
      const dest = destinations.find(d => d.slug === selectedDest);
      params.set("destination", dest?.parentSlug ?? selectedDest);
    }
    if (startDate) params.set("checkin", startDate.toISOString().split("T")[0]);
    if (endDate) params.set("checkout", endDate.toISOString().split("T")[0]);
    params.set("guests", String(Math.max(1, travelers.adults + travelers.children)));
    try {
      sessionStorage.setItem("tp_search", JSON.stringify({
        activeTab, selectedDest,
        startDate: startDate?.toISOString() ?? null,
        endDate: endDate?.toISOString() ?? null,
        travelers,
      }));
    } catch { /* ignore */ }
    const tabPath = activeTab === "hotels" ? "/hotels" : activeTab === "grouptours" ? "/grouptours" : "/packages";
    router.push(`${tabPath}${params.toString() ? `?${params.toString()}` : ""}`);
    onClose();
  }

  function handleClear() {
    setSelectedDest(null); setDestSearch("");
    setStartDate(null); setEndDate(null);
    setTravelers({ adults: 2, children: 0, infants: 0 });
    setActiveSection("where");
  }

  const selectedDestName = destinations.find(d => d.slug === selectedDest)?.name;
  const flexLabel = flexMonth !== null
    ? `${flexDuration.charAt(0).toUpperCase() + flexDuration.slice(1)} in ${MONTH_NAMES[flexMonth]}`
    : flexDuration.charAt(0).toUpperCase() + flexDuration.slice(1);
  const whenLabel = isHotels
    ? (staysMode === "flexible" ? flexLabel : fmtDateRange(startDate, endDate))
    : fmtDate(startDate);
  const whoLabel = totalTravelers > 0 ? `${totalTravelers} guest${totalTravelers !== 1 ? "s" : ""}` : null;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-[var(--bg-subtle)] flex flex-col md:hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-primary)] border-b border-[var(--border-default)] shrink-0">
        <span className="text-[16px] font-bold text-[var(--text-primary)]">Search</span>
        <button type="button" onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          aria-label="Close search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-default)] bg-[var(--bg-primary)] shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 py-3 text-[14px] font-semibold transition-colors cursor-pointer border-b-2 -mb-px",
              activeTab === tab.id
                ? "text-[var(--text-primary)] border-[var(--text-primary)]"
                : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
            )}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Scrollable form */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

        {/* Where */}
        <div className="bg-[var(--bg-primary)] rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)]">
          <button type="button" onClick={() => setActiveSection(activeSection === "where" ? null : "where")}
            className="w-full flex items-center justify-between px-4 py-4 cursor-pointer">
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Where</p>
              <p className={cn("text-[15px] font-semibold mt-0.5", selectedDestName ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>
                {selectedDestName ?? "Anywhere"}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"
              className={cn("transition-transform", activeSection === "where" ? "rotate-180" : "")}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {activeSection === "where" && (
            <div className="border-t border-[var(--border-default)]">
              <div className="px-4 pt-3 pb-2">
                <div className="flex items-center gap-2 h-11 px-3 bg-[var(--bg-subtle)] rounded-[var(--radius-sm)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    value={destSearch}
                    onChange={e => { setDestSearch(e.target.value); if (selectedDest) setSelectedDest(null); }}
                    placeholder="Search destinations"
                    className="flex-1 bg-transparent text-[16px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                    style={{ outline: "none" }}
                    autoFocus
                  />
                  {destSearch && (
                    <button type="button" onClick={() => { setDestSearch(""); setSelectedDest(null); }} className="cursor-pointer">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-[220px] overflow-y-auto pb-2">
                {filteredDests.length === 0 && (
                  <p className="px-4 py-4 text-[14px] text-[var(--text-tertiary)] text-center">No destinations found</p>
                )}
                {filteredDests.map(dest => (
                  <button key={dest.slug} type="button"
                    onClick={() => { setSelectedDest(dest.slug); setDestSearch(dest.name); setActiveSection("when"); }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors",
                      selectedDest === dest.slug ? "bg-[var(--primary-light)]" : "hover:bg-[var(--bg-subtle)]"
                    )}>
                    <span className="w-9 h-9 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] flex items-center justify-center shrink-0">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[var(--text-primary)] truncate">{dest.name}</p>
                      <p className="text-[12px] text-[var(--text-tertiary)]">{dest.region}</p>
                    </div>
                    {selectedDest === dest.slug && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* When */}
        <div className="bg-[var(--bg-primary)] rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)]">
          <button type="button" onClick={() => setActiveSection(activeSection === "when" ? null : "when")}
            className="w-full flex items-center justify-between px-4 py-4 cursor-pointer">
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">When</p>
              <p className={cn("text-[15px] font-semibold mt-0.5", whenLabel ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>
                {whenLabel ?? (isHotels ? "Add dates" : "Any time")}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"
              className={cn("transition-transform", activeSection === "when" ? "rotate-180" : "")}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {activeSection === "when" && (
            <div className={cn(
              "border-t border-[var(--border-default)]",
              isHotels ? "max-h-[55vh] flex flex-col" : "max-h-[55vh] overflow-y-auto"
            )}>
              {isHotels ? (
                <MobileStaysCalendar
                  startDate={startDate}
                  endDate={endDate}
                  onSelect={handleCalendarSelect}
                  onAdvance={() => setActiveSection("who")}
                  mode={staysMode}
                  onModeChange={setStaysMode}
                  flexDuration={flexDuration}
                  onFlexDurationChange={setFlexDuration}
                  flexMonth={flexMonth}
                  onFlexMonthChange={setFlexMonth}
                />
              ) : (
                <MobileCalendarPanel startDate={startDate} onSelect={handleCalendarSelect} />
              )}
            </div>
          )}
        </div>

        {/* Who */}
        <div className="bg-[var(--bg-primary)] rounded-[var(--radius-md)] overflow-hidden border border-[var(--border-default)]">
          <button type="button" onClick={() => setActiveSection(activeSection === "who" ? null : "who")}
            className="w-full flex items-center justify-between px-4 py-4 cursor-pointer">
            <div className="text-left">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Who</p>
              <p className={cn("text-[15px] font-semibold mt-0.5", whoLabel ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>
                {whoLabel ?? "Add guests"}
              </p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round"
              className={cn("transition-transform", activeSection === "who" ? "rotate-180" : "")}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {activeSection === "who" && (
            <div className="border-t border-[var(--border-default)] px-4 divide-y divide-[var(--border-default)]">
              {[
                { key: "adults", label: "Adults", sub: "Ages 13+", min: 1 },
                { key: "children", label: "Children", sub: "Ages 2–12", min: 0 },
                { key: "infants", label: "Infants", sub: "Under 2", min: 0 },
              ].map(({ key, label, sub, min }) => (
                <div key={key} className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-[15px] font-semibold text-[var(--text-primary)]">{label}</p>
                    <p className="text-[12px] text-[var(--text-tertiary)]">{sub}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <button type="button"
                      onClick={() => setTravelers(p => ({ ...p, [key]: Math.max(min, (p as Record<string, number>)[key] - 1) }))}
                      disabled={(travelers as Record<string, number>)[key] <= min}
                      className="w-7 h-7 rounded-full border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed hover:border-[var(--text-primary)] transition-colors">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="2" y1="5" x2="8" y2="5"/></svg>
                    </button>
                    <span className="w-5 text-center text-[16px] font-semibold tabular-nums">
                      {(travelers as Record<string, number>)[key]}
                    </span>
                    <button type="button"
                      onClick={() => setTravelers(p => ({ ...p, [key]: (p as Record<string, number>)[key] + 1 }))}
                      className="w-7 h-7 rounded-full border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] cursor-pointer hover:border-[var(--text-primary)] transition-colors">
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><line x1="2" y1="5" x2="8" y2="5"/><line x1="5" y1="2" x2="5" y2="8"/></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 px-4 py-4 bg-[var(--bg-primary)] border-t border-[var(--border-default)] flex items-center justify-between gap-3">
        <button type="button" onClick={handleClear}
          className="text-[14px] font-semibold text-[var(--text-primary)] underline underline-offset-2 cursor-pointer">
          Clear all
        </button>
        <button type="button" onClick={handleSearch}
          className="flex items-center gap-2 px-6 h-12 bg-[var(--primary)] text-[var(--text-inverse)] rounded-[var(--radius-full)] text-[15px] font-semibold hover:bg-[var(--primary-hover)] active:scale-95 transition-all cursor-pointer"
          style={{ boxShadow: "var(--shadow-sm)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          Search
        </button>
      </div>
    </div>
  );
}
