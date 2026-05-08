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

export function Navbar({ destinations = [] }: { destinations?: DestinationOption[] }) {
  const router = useRouter();
  const { theme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [pillDest, setPillDest] = useState("Anywhere in Pakistan");
  const [pillDetails, setPillDetails] = useState<string | null>(null);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isListing = LISTING_PATHS.some(p => pathname === p);
  // Only the immediate slug level — excludes /packages/slug/checkout, /hotels/slug/checkout/success, etc.
  const isDetail = !isListing && LISTING_PATHS.some(p => {
    if (!pathname.startsWith(p + "/")) return false;
    const rest = pathname.slice(p.length + 1);
    return !rest.includes("/");
  });
  const showDesktopSearch = !isHome;

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

  const closeAll = () => { setMobileOpen(false); setMobileSearchOpen(false); };

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
          {/* Logo */}
          <div className="shrink-0 h-[64px] sm:h-[76px] flex items-center">
            <Link href="/" onClick={closeAll}>
              {theme === "dark" ? (
                <Image
                  src="/logo-white.png"
                  alt="Traverse Pakistan"
                  width={1609}
                  height={706}
                  className="h-8 w-auto sm:h-11"
                  priority
                />
              ) : (
                <Image
                  src="/logo-day.png"
                  alt="Traverse Pakistan"
                  width={1596}
                  height={700}
                  className="h-8 w-auto sm:h-11"
                  priority
                />
              )}
            </Link>
          </div>

          {/* Desktop search bar — hidden on mobile and home page */}
          <div className="hidden md:flex justify-center py-3 min-h-[76px] w-[850px]">
            {showDesktopSearch && <NavSearchBar destinations={destinations} />}
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center md:justify-end gap-1 h-[64px] sm:h-[76px]">
            <ThemeToggle />
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
                    "py-3.5 text-[15px] font-semibold border-b border-[var(--border-default)] last:border-0 transition-colors",
                    pathname.startsWith(link.href)
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-primary)] hover:text-[var(--primary)]"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

          </div>
        </div>
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

      {/* Mobile search pill + tabs — listing pages only */}
      {isListing && (
        <div className="md:hidden bg-[var(--bg-primary)]">
          {/* Search pill */}
          <div className="px-4 pt-8 pb-3">
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

          {/* Category tabs */}
          <div className="flex border-b border-[var(--border-default)] px-4">
            {(
              [
                { label: "Custom Tours", href: "/packages", icon: "compass" },
                { label: "Hotels", href: "/hotels", icon: "house" },
                { label: "Group Tours", href: "/grouptours", icon: "users" },
              ] as { label: string; href: string; icon: IconName }[]
            ).map(tab => (
              <button
                key={tab.href}
                type="button"
                onClick={() => handleTabNav(tab.href)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1 pt-3 pb-2 border-b-2 -mb-px transition-colors cursor-pointer",
                  pathname.startsWith(tab.href)
                    ? "text-[var(--text-primary)] border-[var(--text-primary)]"
                    : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
                )}
              >
                <Icon name={tab.icon} size={22} />
                <span className="text-[12px] font-semibold">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mobile full-screen search overlay */}
      <MobileSearchOverlay
        open={mobileSearchOpen}
        onClose={() => setMobileSearchOpen(false)}
        destinations={destinations}
        defaultTab={isListing ? pathToTab(pathname) : "packages"}
      />
    </>
  );
}
