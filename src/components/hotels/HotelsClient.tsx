"use client";

import { useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { WishlistButton } from "@/components/ui/WishlistButton";
import type { Hotel } from "@/types/hotel";

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

export function HotelsClient({ hotels }: { hotels: Hotel[] }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  const activeFilters = useMemo(() => ({
    destination: searchParams.get("destination") ?? "",
    checkin: searchParams.get("checkin") ?? "",
    checkout: searchParams.get("checkout") ?? "",
    guests: Number(searchParams.get("guests") ?? 0),
  }), [searchParams]);

  const filtered = useMemo(() => (
    activeFilters.destination
      ? hotels.filter((h) => h.destinationSlug === activeFilters.destination)
      : hotels
  ), [hotels, activeFilters.destination]);

  const nights = activeFilters.checkin && activeFilters.checkout
    ? Math.round((new Date(activeFilters.checkout).getTime() - new Date(activeFilters.checkin).getTime()) / 86400000)
    : 0;

  const destName = allDestinations.find((d) => d.slug === activeFilters.destination)?.name;
  const hasFilters = !!(activeFilters.destination || activeFilters.checkin);

  return (
    <>
      {/* Active filter summary */}
      {hasFilters && (
        <div className="bg-[var(--bg-subtle)] border-b border-[var(--border-default)] py-3">
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-16 flex items-center gap-3 flex-wrap">
            <span className="text-[13px] text-[var(--text-secondary)]">
              {filtered.length} hotel{filtered.length !== 1 ? "s" : ""}
              {destName ? ` in ${destName}` : ""}
              {nights > 0 ? ` · ${nights} night${nights !== 1 ? "s" : ""}` : ""}
              {activeFilters.guests > 0 ? ` · ${activeFilters.guests} guests` : ""}
            </span>
            <Link href="/hotels" className="text-[13px] font-semibold text-[var(--primary)] hover:underline">
              Clear filters
            </Link>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-16 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[18px] font-semibold text-[var(--text-primary)]">No hotels found</p>
            <p className="text-[14px] text-[var(--text-tertiary)] mt-2">Try a different destination or clear your filters</p>
            <Link href="/hotels" className="inline-block mt-4 px-6 py-2.5 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-full hover:bg-[var(--primary-hover)] transition-colors">
              Show all hotels
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((hotel) => (
              <Link
                key={hotel.id}
                href={`/hotels/${hotel.slug}${activeFilters.checkin ? `?checkin=${activeFilters.checkin}&checkout=${activeFilters.checkout}&guests=${activeFilters.guests}` : ""}`}
                className="group rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-primary)] transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: "var(--shadow-sm)" }}
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={hotel.image} alt={hotel.name} fill
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-[var(--primary)] text-[var(--on-dark)] rounded-[var(--radius-full)]">
                      {hotel.tier}
                    </span>
                  </div>
                  <div className="absolute top-3 right-3">
                    <WishlistButton itemType="hotel" itemSlug={hotel.slug} />
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                      {hotel.propertyType} · {hotel.destinationSlug}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[13px]">
                      <Icon name="star" size="sm" weight="fill" color="var(--primary-muted)" />
                      <span className="font-semibold text-[var(--text-primary)]">{hotel.rating}</span>
                      <span className="text-[var(--text-tertiary)]">({hotel.reviewCount})</span>
                    </span>
                  </div>
                  <h3 className="text-[17px] font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                    {hotel.name}
                  </h3>
                  <p className="text-[13px] text-[var(--text-tertiary)] mt-1 flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    {hotel.location}
                  </p>
                  <div className="mt-3 pt-3 border-t border-[var(--border-default)] flex items-end justify-between">
                    <div>
                      <span className="text-[17px] font-bold text-[var(--text-primary)] tabular-nums">
                        {nights > 0 ? formatPrice(hotel.pricePerNight * nights) : formatPrice(hotel.pricePerNight)}
                      </span>
                      <span className="text-[13px] text-[var(--text-tertiary)]">
                        {nights > 0 ? ` for ${nights} nights` : " / night"}
                      </span>
                    </div>
                    {nights > 0 && (
                      <span className="text-[12px] text-[var(--text-tertiary)]">{formatPrice(hotel.pricePerNight)}/night</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
