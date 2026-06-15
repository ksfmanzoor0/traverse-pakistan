"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { useTheme } from "./ThemeProvider";
import { NavSearchBar } from "./NavSearchBar";
import { UserMenu } from "@/components/auth/UserMenu";
import { Icon } from "@/components/ui/Icon";
import { MobileSearchOverlay } from "@/components/search/MobileSearchOverlay";
import { type DestinationOption } from "@/components/home/SearchWidget";
import { type IconName } from "@/components/ui/icon-map";

const NAV_LINKS = [
  { label: "Destinations", href: "/destinations" },
  { label: "Custom Tours", href: "/packages" },
  { label: "Group Tours", href: "/grouptours" },
  { label: "Hotels", href: "/hotels" },
  { label: "Plan My Trip", href: "/customise-tour" },
];

const LISTING_PATHS = ["/packages", "/hotels", "/grouptours"] as const;
type ListingTabId = "packages" | "hotels" | "grouptours";

function pathToTab(pathname: string): ListingTabId {
  if (pathname.startsWith("/hotels")) return "hotels";
  if (pathname.startsWith("/grouptours")) return "grouptours";
  return "packages";
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const MOBILE_TABS = [
  { label: "Custom Tours", href: "/packages", icon: "compass" as IconName, sectionId: "section-packages" },
  { label: "Hotels",       href: "/hotels",   icon: "house"   as IconName, sectionId: "section-hotels"   },
  { label: "Group Tours",  href: "/grouptours", icon: "users" as IconName, sectionId: "section-tours"    },
];

export function Navbar({ destinations = [] }: { destinations?: DestinationOption[] }) {
  const router = useRouter();
  const { theme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [pillDest, setPillDest] = useState("Anywhere in Pakistan");
  const [pillDetails, setPillDetails] = useState<string | null>(null);
  const pathname = usePathname() ?? "";
  const isHome = pathname === "/";
  const isListing = LISTING_PATHS.some(p => pathname === p);
  // Slug level + checkout pages — excludes /success and deeper pages
  const isDetail = !isListing && LISTING_PATHS.some(p => {
    if (!pathname.startsWith(p + "/")) return false;
    const rest = pathname.slice(p.length + 1);
    return !rest.includes("/") || rest.endsWith("/checkout");
  });
  const showDesktopSearch = !isHome && pathname !== "/customise-tour";

  const detailCategory = pathname.startsWith("/hotels") ? "Hotels"
    : pathname.startsWith("/grouptours") ? "Group Tours"
    : "Custom Tours";

  // Build pill content from sessionStorage
  useEffect(() => {
    if (!isListing && !isDetail) { setPillDest("Anywhere in Pakistan"); setPillDetails(null); return; }
    try {
      const raw = sessionStorage.getItem("tp_search");
      if (!raw) { setPillDest("Anywhere in Pakistan"); setPillDetails(null); return; }
      const s = JSON.parse(raw) as {
        selectedDest?: string;
        startDate?: string;
        endDate?: string;
        travelers?: { adults: number; children: number; infants: number };
      };
      // Line 1 — destination
      const destName = s.selectedDest ? destinations.find(d => d.slug === s.selectedDest)?.name : null;
      setPillDest(destName ?? "Anywhere in Pakistan");
      // Line 2 — dates · guests
      const details: string[] = [];
      if (s.startDate) {
        const start = new Date(s.startDate);
        if (s.endDate) {
          details.push(`${fmtShort(start)} – ${fmtShort(new Date(s.endDate))}`);
        } else {
          details.push(fmtShort(start));
        }
      }
      if (s.travelers) {
        const total = s.travelers.adults + s.travelers.children + s.travelers.infants;
        if (total > 0) details.push(`${total} guest${total !== 1 ? "s" : ""}`);
      }
      setPillDetails(details.length ? details.join(" · ") : null);
    } catch {
      setPillDest("Anywhere in Pakistan");
      setPillDetails(null);
    }
  }, [pathname, isListing, destinations, mobileSearchOpen]);

  useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const closeAll = () => { setMobileOpen(false); setMobileSearchOpen(false); };

  function handleMobileTabClick(tab: typeof MOBILE_TABS[number]) {
    if (isHome) {
      const el = document.getElementById(tab.sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      handleTabNav(tab.href);
    }
  }

  function handleTabNav(href: string) {
    closeAll();
    try {
      const raw = sessionStorage.getItem("tp_search");
      if (!raw) { router.push(href); return; }
      const s = JSON.parse(raw) as {
        selectedDest?: string;
        startDate?: string;
        endDate?: string;
        travelers?: { adults: number; children: number; infants: number };
      };
      const params = new URLSearchParams();
      if (s.selectedDest) params.set("destination", s.selectedDest);
      if (s.startDate) params.set("checkin", s.startDate.split("T")[0]);
      if (s.endDate) params.set("checkout", s.endDate.split("T")[0]);
      if (s.travelers) {
        const total = s.travelers.adults + s.travelers.children;
        if (total > 0) params.set("guests", String(total));
      }
      const qs = params.toString();
      router.push(`${href}${qs ? `?${qs}` : ""}`);
    } catch {
      router.push(href);
    }
  }

  return (
    <>
      <header
        className="sticky top-0 z-50 bg-[var(--bg-primary)]/95 backdrop-blur-md"
        style={{ boxShadow: "0 1px 0 var(--border-default)" }}
      >
        <nav className="mx-auto max-w-[1400px] flex items-center md:grid md:grid-cols-[1fr_auto_1fr] md:items-start min-h-[64px] sm:min-h-[76px] px-4 sm:px-8 lg:px-16">
          {/* Logo — CSS-driven so there's no flash on dark-mode reload */}
          <div className="shrink-0 h-[64px] sm:h-[76px] flex items-center">
            <Link href="/" onClick={closeAll}>
              <Image
                src="/logo-white.png"
                alt="Traverse Pakistan"
                width={1609}
                height={706}
                className="h-8 w-auto sm:h-11 hidden [[data-theme=dark]_&]:block"
                style={{ mixBlendMode: "screen" }}
                priority
                unoptimized
              />
              <Image
                src="/logo-day.png"
                alt="Traverse Pakistan"
                width={1596}
                height={700}
                className="h-8 w-auto sm:h-11 [[data-theme=dark]_&]:hidden"
                style={{ mixBlendMode: "multiply" }}
                priority
                unoptimized
              />
            </Link>
          </div>

          {/* Desktop search bar — hidden on mobile and home page */}
          <div className="hidden md:flex justify-center py-3 min-h-[76px] w-[850px]">
            {showDesktopSearch && <NavSearchBar destinations={destinations} />}
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center md:justify-end gap-1 h-[64px] sm:h-[76px]">
            <ThemeToggle />
            <Link
              href="/customise-tour"
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-sm)] text-[13px] font-semibold whitespace-nowrap text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <Icon name="compass" size="xs" />
              Plan My Trip
            </Link>
            <Link
              href="/bookings/find"
              className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-[var(--radius-sm)] text-[13px] font-semibold whitespace-nowrap text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              <Icon name="bookmark" size="xs" />
              My Bookings
            </Link>
            <UserMenu />

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => { setMobileOpen(!mobileOpen); setMobileSearchOpen(false); }}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
              aria-label="Toggle menu"
            >
              <div className="flex flex-col gap-[5px]">
                <span className={cn("w-[18px] h-[1.5px] bg-[var(--text-primary)] transition-all duration-300", mobileOpen && "translate-y-[7px] rotate-45")} />
                <span className={cn("w-[18px] h-[1.5px] bg-[var(--text-primary)] transition-all duration-300", mobileOpen && "opacity-0")} />
                <span className={cn("w-[18px] h-[1.5px] bg-[var(--text-primary)] transition-all duration-300", mobileOpen && "-translate-y-[7px] -rotate-45")} />
              </div>
            </button>
          </div>
        </nav>

        {/* Mobile nav drawer */}
        <div
          className={cn(
            "lg:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
            mobileOpen ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="bg-[var(--bg-primary)] border-t border-[var(--border-default)]">
            <nav className="flex flex-col px-4 py-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeAll}
                  className={cn(
                    "py-3.5 text-[15px] font-semibold border-b border-[var(--border-default)] transition-colors",
                    pathname.startsWith(link.href)
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-primary)] hover:text-[var(--primary)]"
                  )}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/bookings/find"
                onClick={closeAll}
                className={cn(
                  "flex items-center gap-2 py-3.5 text-[15px] font-semibold transition-colors",
                  pathname.startsWith("/bookings") || pathname.startsWith("/mybookings")
                    ? "text-[var(--primary)]"
                    : "text-[var(--text-primary)] hover:text-[var(--primary)]"
                )}
              >
                <Icon name="bookmark" size="xs" />
                My Bookings
              </Link>
            </nav>

          </div>
        </div>

        {/* Mobile search pill + tabs — home + listing pages (inside sticky header) */}
        {(isHome || isListing) && (
          <div className="md:hidden bg-[var(--bg-primary)]">
            {/* Search pill */}
            <div className="px-4 pt-4 pb-3">
              <button
                type="button"
                onClick={() => { setMobileSearchOpen(true); setMobileOpen(false); }}
                className="w-full flex items-center h-14 px-5 bg-[var(--bg-primary)] rounded-[var(--radius-full)] cursor-pointer border border-[var(--border-default)]"
                style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.12)" }}
              >
                <div className="w-[18px] shrink-0" />
                <div className="flex-1 text-center min-w-0">
                  <p className="text-[15px] font-semibold text-[var(--text-primary)] truncate leading-tight">{pillDest}</p>
                  {pillDetails && (
                    <p className="text-[13px] text-[var(--text-tertiary)] truncate leading-tight mt-0.5">{pillDetails}</p>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
              </button>
            </div>

            {/* Category tabs — icons collapse on scroll */}
            <div className="flex border-b border-[var(--border-default)] px-4">
              {MOBILE_TABS.map(tab => (
                <button
                  key={tab.href}
                  type="button"
                  onClick={() => handleMobileTabClick(tab)}
                  className={cn(
                    "flex-1 flex items-center justify-center border-b-2 -mb-px transition-all duration-200 cursor-pointer",
                    compact ? "flex-row gap-1.5 py-2.5" : "flex-col gap-1 pt-3 pb-2",
                    pathname.startsWith(tab.href)
                      ? "text-[var(--text-primary)] border-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
                  )}
                >
                  <span className={cn(
                    "transition-all duration-200 overflow-hidden",
                    compact ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}>
                    <Icon name={tab.icon} size={22} />
                  </span>
                  <span className="text-[12px] font-semibold">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Mobile detail back row */}
      {isDetail && (
        <div className="md:hidden flex items-center px-4 pt-3 pb-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="shrink-0 text-[var(--text-primary)] hover:text-[var(--primary)] transition-colors cursor-pointer"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 12H4M4 12l7 7M4 12l7-7" />
            </svg>
          </button>
          <p className="flex-1 text-center text-[13px] font-medium text-[var(--text-tertiary)]">
            {detailCategory}{pillDest !== "Anywhere in Pakistan" ? ` · ${pillDest}` : ""}
          </p>
          <div className="shrink-0 w-[22px]" />
        </div>
      )}

      {/* Mobile full-screen search overlay */}
      <MobileSearchOverlay
        open={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
        destinations={destinations}
        defaultTab={(isListing || isHome) ? pathToTab(pathname) : "packages"}
      />
    </>
  );
}
