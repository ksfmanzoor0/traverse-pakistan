"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FilterTag } from "@/components/ui/FilterTag";
import { TourGrid } from "@/components/tours/TourGrid";
import type { Tour } from "@/types/tour";

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

const allDestinations = [
  { name: "Hunza Valley", slug: "hunza" },
  { name: "Skardu", slug: "skardu" },
  { name: "Fairy Meadows", slug: "fairy-meadows" },
  { name: "Ghizar & Phandar", slug: "ghizer" },
  { name: "Chitral & Kalash", slug: "chitral" },
  { name: "Kumrat Valley", slug: "kumrat" },
  { name: "Swat & Malam Jabba", slug: "swat" },
  { name: "Neelam Valley", slug: "neelam-valley" },
  { name: "Makran Coast & Gwadar", slug: "makran" },
];

export function GroupToursClient({ tours }: { tours: Tour[] }) {
  const searchParams = useSearchParams();
  const [activeFilter, setActiveFilter] = useState("all");
  const [sort, setSort] = useState("date-asc");
  const destFilter = searchParams.get("destination") ?? "";
  const dateFilter = searchParams.get("checkin") ?? "";

  const filtered = tours
    .filter((t) => activeFilter === "all" || t.category === activeFilter)
    .filter((t) => !destFilter || t.destinationSlug === destFilter)
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

  const destName = allDestinations.find((d) => d.slug === destFilter)?.name;
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

      {/* Sort */}
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-16 py-4 sm:py-8">
        <div className="flex items-center justify-end gap-4 mb-6 sm:mb-8">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 px-4 text-[13px] border border-[var(--border-default)] rounded-full bg-[var(--bg-primary)] text-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 cursor-pointer"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

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
