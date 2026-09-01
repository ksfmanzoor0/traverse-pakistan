"use client";

import { useState } from "react";
import { HomeFeaturedEditor, type HomeEditorRow } from "@/components/admin/HomeFeaturedEditor";
import {
  saveHomeFeaturedTours,
  saveHomeFeaturedPackages,
  saveHomeDestinations,
} from "./actions";

type Props = {
  tours: HomeEditorRow[];
  packages: HomeEditorRow[];
  destinations: HomeEditorRow[];
};

type Tab = "tours" | "packages" | "destinations";

const TABS: { key: Tab; label: string }[] = [
  { key: "tours", label: "Tours" },
  { key: "packages", label: "Packages" },
  { key: "destinations", label: "Destinations" },
];

export function HomeAdminTabs({ tours, packages, destinations }: Props) {
  const [tab, setTab] = useState<Tab>("tours");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-[var(--border-default)]">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-[14px] font-medium border-b-2 transition-colors ${
                active
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "tours" && (
        <HomeFeaturedEditor
          initial={tours}
          saveAction={saveHomeFeaturedTours}
          emptyMessage="No tours yet."
        />
      )}
      {tab === "packages" && (
        <HomeFeaturedEditor
          initial={packages}
          saveAction={saveHomeFeaturedPackages}
          emptyMessage="No packages yet."
        />
      )}
      {tab === "destinations" && (
        <HomeFeaturedEditor
          initial={destinations}
          saveAction={saveHomeDestinations}
          showFeaturedToggle={false}
          emptyMessage="No parent destinations yet."
        />
      )}
    </div>
  );
}
