"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { MobileSearchOverlay } from "@/components/search/MobileSearchOverlay";
import { type DestinationOption } from "@/components/home/SearchWidget";
import { type IconName } from "@/components/ui/icon-map";

const TABS: { id: "packages" | "hotels" | "grouptours"; label: string; icon: IconName }[] = [
  { id: "packages", label: "Custom Tours", icon: "compass" },
  { id: "hotels", label: "Hotels", icon: "house" },
  { id: "grouptours", label: "Group Tours", icon: "users" },
];

type TabId = (typeof TABS)[number]["id"];

interface Props {
  destinations: DestinationOption[];
}

export function MobileHomeContent({ destinations }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("packages");

  return (
    <div className="md:hidden">
      {/* Search pill */}
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

      {/* Category tabs */}
      <div className="flex border-b border-[var(--border-default)] px-4">
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex flex-col items-center gap-1 pt-3 pb-2 border-b-2 -mb-px transition-colors cursor-pointer",
              activeTab === tab.id
                ? "text-[var(--text-primary)] border-[var(--text-primary)]"
                : "text-[var(--text-secondary)] border-transparent hover:text-[var(--text-primary)]"
            )}
          >
            <Icon name={tab.icon} size={22} />
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
