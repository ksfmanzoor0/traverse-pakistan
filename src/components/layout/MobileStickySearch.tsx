"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { MobileSearchOverlay } from "@/components/search/MobileSearchOverlay";
import { type DestinationOption } from "@/components/home/SearchWidget";
import { type IconName } from "@/components/ui/icon-map";

// Hide on detail pages: /hotels/[slug], /packages/[slug], /grouptours/[slug]
const DETAIL_RE = /^\/(hotels|packages|grouptours)\/.+/;

const TABS: { id: "packages" | "hotels" | "grouptours"; label: string; icon: IconName; sectionId: string; href: string }[] = [
  { id: "packages", label: "Custom Tours", icon: "compass", sectionId: "section-packages", href: "/packages" },
  { id: "hotels",   label: "Hotels",       icon: "house",   sectionId: "section-hotels",   href: "/hotels"   },
  { id: "grouptours", label: "Group Tours", icon: "users",  sectionId: "section-tours",    href: "/grouptours" },
];

type TabId = (typeof TABS)[number]["id"];

function activeTabFromPath(pathname: string | null): TabId {
  if (!pathname) return "packages";
  if (pathname.startsWith("/hotels")) return "hotels";
  if (pathname.startsWith("/grouptours")) return "grouptours";
  return "packages";
}

export function MobileStickySearch({ destinations }: { destinations: DestinationOption[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [compact, setCompact] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(() => activeTabFromPath(pathname));

  const isHome = pathname === "/";

  useEffect(() => {
    setActiveTab(activeTabFromPath(pathname));
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setCompact(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (DETAIL_RE.test(pathname ?? "")) return null;

  function handleTabClick(tab: typeof TABS[number]) {
    setActiveTab(tab.id);
    if (isHome) {
      const el = document.getElementById(tab.sectionId);
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push(tab.href);
    }
  }

  return (
    <div className="md:hidden sticky top-16 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-default)]">
      {/* Search pill — always visible */}
      <div className="px-4 pt-4 pb-3">
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="w-full flex items-center gap-3 h-14 px-5 bg-[var(--bg-primary)] rounded-[var(--radius-full)] text-left cursor-pointer border border-[var(--border-default)]"
          style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.12)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <span className="text-[15px] text-[var(--text-tertiary)] font-medium">Start your search</span>
        </button>
      </div>

      {/* Tabs — icons collapse on scroll */}
      <div className="flex px-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabClick(tab)}
            className={cn(
              "flex-1 flex items-center justify-center border-b-2 -mb-px transition-all duration-200 cursor-pointer",
              compact ? "flex-row gap-1.5 py-2.5" : "flex-col gap-1 pt-3 pb-2",
              activeTab === tab.id
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

      <MobileSearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        destinations={destinations}
        defaultTab={activeTab}
      />
    </div>
  );
}
