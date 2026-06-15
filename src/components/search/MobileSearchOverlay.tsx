"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { type DestinationOption } from "@/components/home/SearchWidget";
import { MobileSearchFields, type Travelers } from "./MobileSearchFields";

const TABS = [
  { id: "packages", label: "Custom Tours" },
  { id: "hotels", label: "Hotels" },
  { id: "grouptours", label: "Group Tours" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface Props {
  open: boolean;
  onClose: () => void;
  destinations: DestinationOption[];
  defaultTab?: TabId;
}

export function MobileSearchOverlay({ open, onClose, destinations, defaultTab = "packages" }: Props) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<TabId>(defaultTab);
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [travelers, setTravelers] = useState<Travelers>({ adults: 2, children: 0, infants: 0 });
  // Remount key for the fields — bumped on tab change / clear so the accordion
  // resets to the "where" step (the fields component owns its own UI state).
  const [fieldsKey, setFieldsKey] = useState(0);

  const isHotels = activeTab === "hotels";

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
        travelers?: Travelers;
      };
      if (s.selectedDest) setSelectedDest(s.selectedDest);
      if (s.startDate) setStartDate(new Date(s.startDate));
      if (s.endDate) setEndDate(new Date(s.endDate));
      if (s.travelers) setTravelers(s.travelers);
    } catch { /* ignore */ }
  }, [open, defaultTab]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

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
    setSelectedDest(null);
    setStartDate(null); setEndDate(null);
    setTravelers({ adults: 2, children: 0, infants: 0 });
    setFieldsKey(k => k + 1);
  }

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
          <button key={tab.id} type="button" onClick={() => { setActiveTab(tab.id); setFieldsKey(k => k + 1); }}
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
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <MobileSearchFields
          key={fieldsKey}
          destinations={destinations}
          rangeDates={isHotels}
          selectedDest={selectedDest}
          onSelectedDestChange={setSelectedDest}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          travelers={travelers}
          onTravelersChange={setTravelers}
        />
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
