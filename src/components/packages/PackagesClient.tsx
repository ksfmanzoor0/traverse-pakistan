"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PackageCard } from "@/components/packages/PackageCard";
import type { Package } from "@/types/package";
import type { DestinationOption } from "@/components/home/SearchWidget";

export function PackagesClient({ packages, destinations = [] }: { packages: Package[]; destinations?: DestinationOption[] }) {
  const searchParams = useSearchParams();
  const destFilter = searchParams.get("destination") ?? "";
  const dateFilter = searchParams.get("checkin") ?? "";

  // Resolve sub-destination to its parent slug for package filtering
  const selectedDest = destinations.find((d) => d.slug === destFilter);
  const filterSlug = selectedDest?.parentSlug ?? destFilter;

  const filtered = useMemo(() => (
    filterSlug
      ? packages.filter(
          (p) =>
            p.destinationSlug === filterSlug ||
            p.relatedDestinationSlugs?.includes(filterSlug)
        )
      : packages
  ), [packages, filterSlug]);

  const destName = destinations.find((d) => d.slug === destFilter)?.name;
  const hasFilters = !!(destFilter || dateFilter);

  const dateLabel = dateFilter
    ? new Date(dateFilter).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;

  return (
    <>
      {/* Active filter summary */}
      {hasFilters && (
        <div className="bg-[var(--bg-subtle)] border-b border-[var(--border-default)] py-3">
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-16 flex items-center gap-3 flex-wrap">
            <span className="text-[13px] text-[var(--text-secondary)]">
              {filtered.length} package{filtered.length !== 1 ? "s" : ""}
              {destName ? ` in ${destName}` : ""}
              {dateLabel ? ` · from ${dateLabel}` : ""}
            </span>
            <Link href="/packages" className="text-[13px] font-semibold text-[var(--primary)] hover:underline">
              Clear filters
            </Link>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-16 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[18px] font-semibold text-[var(--text-primary)]">No packages found</p>
            <p className="text-[14px] text-[var(--text-tertiary)] mt-2">Try a different destination or clear your filters</p>
            <Link href="/packages" className="inline-block mt-4 px-6 py-2.5 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-full hover:bg-[var(--primary-hover)] transition-colors">
              Show all packages
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} variant="grid" />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
