"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FilterTag } from "@/components/ui/FilterTag";
import { TourGrid } from "@/components/tours/TourGrid";
import type { Tour } from "@/types/tour";
import type { DestinationOption } from "@/components/home/SearchWidget";

const filterOptions = [
  { label: "All", value: "all" },
  { label: "Group Tours", value: "group-tour" },
  { label: "Trekking", value: "trekking" },
  { label: "Cultural", value: "cultural" },
  { label: "Luxury", value: "luxury" },
  { label: "Adventure", value: "adventure" },
];

const sortOptions = [
  { label: "Date: Soonest", value: "date-asc" },
  { label: "Date: Latest", value: "date-desc" },
  { label: "Price: Low to High", value: "price-asc" },
  { label: "Price: High to Low", value: "price-desc" },
  { label: "Duration: Short", value: "duration-asc" },
  { label: "Rating", value: "rating" },
];

export function GroupToursClient({ tours, destinations = [] }: { tours: Tour[]; destinations?: DestinationOption[] }) {
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState("all");
  const [sort, setSort] = useState("date-asc");
  const destFilter = searchParams.get("destination") ?? "";
  const dateFilter = searchParams.get("checkin") ?? "";

  // Sub → parent fallback: a search for "khaplu" should also surface tours
  // tagged "skardu" (the parent region).
  const picked = destinations.find((d) => d.slug === destFilter);
  const parentSlug = picked?.parentSlug ?? null;

  const filtered = tours
    .filter((t) => activeFilter === "all" || t.category === activeFilter)
    .filter((t) => !destFilter || t.destinationSlug === destFilter || (parentSlug ? t.destinationSlug === parentSlug : false))
    .sort((a, b) => {
      switch (sort) {
        case "date-asc":
          return (a.departureDate || "9999") < (b.departureDate || "9999") ? -1 : 1;
        case "date-desc":
          return (a.departureDate || "") > (b.departureDate || "") ? -1 : 1;
        case "price-asc": return a.price - b.price;
        case "price-desc": return b.price - a.price;
        case "duration-asc": return a.duration - b.duration;
        case "rating": return b.rating - a.rating;
        default: return 0;
      }
    });

  const destName = destinations.find((d) => d.slug === destFilter)?.name;
  const hasFilters = !!(destFilter || dateFilter);

  return (
    <>
      {/* Active filter summary */}
      {hasFilters && (
        <div className="bg-[var(--bg-subtle)] border-b border-[var(--border-default)] py-3">
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-16 flex items-center gap-3 flex-wrap">
            <span className="text-[13px] text-[var(--text-secondary)]">
              {filtered.length} tour{filtered.length !== 1 ? "s" : ""}
              {destName ? ` in ${destName}` : ""}
              {dateFilter ? ` · from ${new Date(dateFilter).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
            </span>
            <Link href="/grouptours" className="text-[13px] font-semibold text-[var(--primary)] hover:underline">
              Clear filters
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-16 py-4 sm:py-8">

        <p className="text-[14px] text-[var(--text-tertiary)] mb-6">
          {filtered.length} tour{filtered.length !== 1 ? "s" : ""} found
        </p>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[18px] font-semibold text-[var(--text-primary)]">No tours found</p>
            <p className="text-[14px] text-[var(--text-tertiary)] mt-2">Try a different destination or clear your filters</p>
            <Link href="/grouptours" className="inline-block mt-4 px-6 py-2.5 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-full hover:bg-[var(--primary-hover)] transition-colors">
              Show all tours
            </Link>
          </div>
        ) : (
          <TourGrid tours={filtered} />
        )}
      </div>
    </>
  );
}
