"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { SearchWidget, type DestinationOption } from "@/components/home/SearchWidget";

const TABS = [
  { id: "packages", label: "Custom Tours" },
  { id: "hotels", label: "Hotels" },
  { id: "grouptours", label: "Group Tours" },
] as const;

type TabId = "packages" | "hotels" | "grouptours";

function getDefaultTab(pathname: string): TabId {
  if (pathname.startsWith("/hotels")) return "hotels";
  if (pathname.startsWith("/grouptours")) return "grouptours";
  return "packages";
}


const TAB_LABELS: Record<string, string> = {
  packages: "Custom Tours",
  hotels: "Hotels",
  grouptours: "Group Tours",
};

type SavedSearch = {
  activeTab?: string;
  selectedDest?: string;
  startDate?: string;
  endDate?: string;
  travelers?: { adults: number; children: number };
};

function fmtPillDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function readSavedSearch(): SavedSearch | null {
  try {
    const raw = sessionStorage.getItem("tp_search");
    return raw ? (JSON.parse(raw) as SavedSearch) : null;
  } catch {
    return null;
  }
}

const SPRING = { duration: 0.4, ease: [0.32, 0.72, 0, 1] } as const;
const EASE_OUT = { duration: 0.4, ease: [0.32, 0.72, 0, 1] } as const;

export function NavSearchBar({ destinations = [] }: { destinations?: DestinationOption[] }) {
  const destNamesMap = Object.fromEntries(destinations.map((d) => [d.slug, d.name]));
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(getDefaultTab(pathname));
  const [mounted, setMounted] = useState(false);
  const [heroVisible, setHeroVisible] = useState(pathname !== "/");
  const [pill, setPill] = useState<SavedSearch | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const isHome = pathname === "/";

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) setPill(pathname === "/" ? null : readSavedSearch());
  }, [open, pathname]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    setActiveTab(getDefaultTab(pathname));
    setOpen(false);
    if (pathname === "/") {
      try { sessionStorage.removeItem("tp_search"); } catch { /* ignore */ }
      setPill(null);
    }
  }, [pathname]);

  useEffect(() => {
    if (!isHome) {
      setHeroVisible(false);
      return;
    }
    const hero = document.getElementById("hero-search");
    if (!hero) { setHeroVisible(false); return; }

    setHeroVisible(true);
    const io = new IntersectionObserver(
      ([entry]) => setHeroVisible(entry.isIntersecting),
      { threshold: 0, rootMargin: "-48px 0px 0px 0px" }
    );
    io.observe(hero);
    return () => io.disconnect();
  }, [isHome, pathname]);

  const merged = isHome && !heroVisible;
  const hidden = isHome && heroVisible;

  return (
    <>
      {/* Grey overlay via portal — fades in/out with AnimatePresence */}
      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className="fixed inset-0 bg-black/25 z-40"
              onClick={() => setOpen(false)}
            />
          )}
        </AnimatePresence>,
        document.body
      )}

      <div
        ref={ref}
        aria-hidden={hidden}
        className={cn(
          "relative flex justify-center items-center w-full transition-all duration-[400ms] ease-[cubic-bezier(0.2,0,0,1)]",
          hidden
            ? "opacity-0 -translate-y-2 pointer-events-none"
            : "opacity-100 translate-y-0",
          merged && "motion-safe:animate-[navSearchDrop_420ms_cubic-bezier(0.2,0,0,1)]"
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>

          {/* CLOSED: compact pill */}
          {!open && (() => {
            const destName = pill?.selectedDest ? destNamesMap[pill.selectedDest] ?? pill.selectedDest : null;
            const tabLabel = pill?.activeTab ? TAB_LABELS[pill.activeTab] : null;
            const checkIn = fmtPillDate(pill?.startDate);
            const checkOut = fmtPillDate(pill?.endDate);
            const totalGuests = pill?.travelers ? pill.travelers.adults + pill.travelers.children : 0;

            const whereLabel = destName
              ? `${tabLabel ?? "Custom Tours"} in ${destName}`
              : "Anywhere";
            const whenLabel = checkIn
              ? (checkOut ? `${checkIn} – ${checkOut}` : checkIn)
              : "Any week";
            const whoLabel = totalGuests > 0
              ? `${totalGuests} guest${totalGuests !== 1 ? "s" : ""}`
              : null;

            return (
              <motion.button
                key="pill"
                type="button"
                onClick={() => setOpen(true)}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] } }}
                transition={EASE_OUT}
                className="flex items-center h-16 w-full max-w-[580px] border border-[var(--border-default)] rounded-full bg-[var(--bg-primary)] hover:shadow-md cursor-pointer pl-5 pr-2"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <span className="flex-[2] flex flex-col items-start justify-center text-left px-2 min-w-0">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-tertiary)] leading-tight mb-0.5">Where</span>
                  <span className="block text-[12px] font-semibold text-[var(--text-primary)] leading-snug truncate">{whereLabel}</span>
                </span>
                <span className="shrink-0 w-px h-7 bg-[var(--border-default)]" />
                <span className="flex-[1] flex flex-col items-center justify-center text-center px-3">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-tertiary)] leading-tight mb-0.5">When</span>
                  <span className={cn("block text-[12px] leading-snug whitespace-nowrap", checkIn ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>{whenLabel}</span>
                </span>
                <span className="shrink-0 w-px h-7 bg-[var(--border-default)]" />
                <span className="flex-[1] flex flex-col items-center justify-center text-center px-3">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.07em] text-[var(--text-tertiary)] leading-tight mb-0.5">Who</span>
                  <span className={cn("block text-[12px] leading-snug whitespace-nowrap", whoLabel ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-tertiary)]")}>
                    {whoLabel ?? "Add guests"}
                  </span>
                </span>
                <span className="shrink-0 flex items-center justify-center w-11 h-11 rounded-full bg-[var(--primary)] ml-2">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                  </svg>
                </span>
              </motion.button>
            );
          })()}

          {/* OPEN: tabs + full search bar inline in navbar */}
          {open && (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.28, ease: [0.32, 0.72, 0, 1] } }}
              transition={EASE_OUT}
              className="w-full max-w-[850px] min-h-[168px] flex flex-col justify-center"
            >
              {/* Tab row with sliding indicator */}
              <LayoutGroup>
                <div className="flex justify-center gap-1 mb-5">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "relative px-5 py-1.5 text-[16px] font-semibold transition-colors duration-200 cursor-pointer rounded-[var(--radius-full)]",
                        activeTab === tab.id
                          ? "text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                      )}
                    >
                      <span className="relative inline-block">
                        {tab.label}
                        {activeTab === tab.id && (
                          <motion.span
                            layoutId="nav-tab-indicator"
                            className="absolute -bottom-0.5 left-0 w-full h-[2px] bg-[var(--text-primary)] rounded-full"
                            transition={SPRING}
                          />
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </LayoutGroup>

              {/* Search bar */}
              <SearchWidget
                mode="filter"
                defaultTab={activeTab}
                hideTabs
                defaultActiveField="destination"
                destinations={destinations}
                onClose={() => setOpen(false)}
              />
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </>
  );
}
