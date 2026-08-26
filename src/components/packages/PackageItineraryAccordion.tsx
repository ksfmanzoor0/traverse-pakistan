"use client";

import Image from "next/image";
import Link from "next/link";
import { AccordionItem } from "@/components/ui/Accordion";
import { Icon } from "@/components/ui/Icon";
import type { PackageItineraryDay, PackageTier } from "@/types/package";
import type { Hotel } from "@/types/hotel";
import { formatPrice } from "@/lib/utils";

interface PackageItineraryAccordionProps {
  days: PackageItineraryDay[];
  selectedTier: PackageTier;
  hotelsMap: Record<string, Hotel>;
  departureCity: "islamabad" | "lahore" | "karachi";
}

const TIER_LABELS: Record<PackageTier, string> = {
  deluxe: "Deluxe Stay",
  luxury: "Luxury Stay",
};

const TIER_COLORS: Record<PackageTier, string> = {
  deluxe: "bg-[var(--primary-light)] text-[var(--primary-deep)] border-[var(--primary)]/20",
  luxury: "bg-[var(--accent-warm-light)] text-[var(--accent-warm)] border-[var(--accent-warm)]/30",
};

// DB stores cityOnly as city codes ("LHE", …). Component receives the name
// form ("lahore") so it can drive display logic; convert once at the boundary
// and compare in the DB's shape.
const NAME_TO_CODE = { islamabad: "ISB", lahore: "LHE", karachi: "KHI" } as const;

export function PackageItineraryAccordion({ days, selectedTier, hotelsMap, departureCity }: PackageItineraryAccordionProps) {
  const cityCode: string = NAME_TO_CODE[departureCity];
  const visibleDays = days.filter((d) => {
    if (!d.cityOnly) return true;
    const allowed = Array.isArray(d.cityOnly) ? d.cityOnly : [d.cityOnly];
    return (allowed as readonly string[]).includes(cityCode);
  });
  return (
    <div className="border border-[var(--border-default)] rounded-xl overflow-hidden">
      {visibleDays.map((day) => {
        const hotelSlug = day.hotels[selectedTier];
        const hotel = hotelsMap[hotelSlug];
        const stops = day.stops.filter((s) => !s.cityOnly || (s.cityOnly as string) === cityCode);

        return (
          <AccordionItem
            key={day.dayNumber}
            defaultOpen={day.dayNumber === (departureCity === "karachi" ? 0 : 1)}
            title={
              <div className="flex items-center gap-3">
                <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--text-inverse)] text-[13px] font-bold flex items-center justify-center">
                  {day.dayNumber}
                </span>
                <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {day.title}
                </span>
              </div>
            }
            className="px-5"
          >
            <div className="pl-11">
              {/* Hotel card — replaces image */}
              {hotel && (
                <Link
                  href={`/hotels/${hotel.slug}`}
                  className="group/hotel block mb-4 border border-[var(--border-default)] rounded-xl overflow-hidden hover:border-[var(--primary)] hover:shadow-md transition-all duration-200"
                >
                  <div className="flex gap-0">
                    {/* Hotel image */}
                    <div className="relative w-28 sm:w-36 shrink-0 aspect-[4/3]">
                      <Image
                        src={hotel.image}
                        alt={hotel.name}
                        fill
                        className="object-cover"
                        sizes="144px"
                      />
                    </div>
                    {/* Hotel info */}
                    <div className="flex flex-col justify-between p-3 sm:p-4 flex-1 min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] sm:text-[14px] font-bold text-[var(--text-primary)] leading-snug group-hover/hotel:text-[var(--primary)] transition-colors line-clamp-1">
                            {hotel.name}
                          </p>
                          <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${TIER_COLORS[selectedTier]}`}>
                            {TIER_LABELS[selectedTier]}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-[12px] text-[var(--text-tertiary)] mt-0.5 flex items-center gap-1">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                          </svg>
                          {hotel.location}
                        </p>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <Icon name="star" size="xs" weight="fill" color="var(--primary-muted)" />
                          <span className="text-[12px] font-semibold text-[var(--text-primary)]">{hotel.rating}</span>
                          <span className="text-[11px] text-[var(--text-tertiary)]">({hotel.reviewCount})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[13px] font-bold text-[var(--text-primary)]">{formatPrice(hotel.pricePerNight)}</span>
                          <span className="text-[10px] text-[var(--text-tertiary)]">/night</span>
                        </div>
                      </div>
                      <p className="text-[11px] text-[var(--primary)] font-medium mt-1 flex items-center gap-1">
                        View hotel
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 3l5 5-5 5" />
                        </svg>
                      </p>
                    </div>
                  </div>
                </Link>
              )}

              {/* Description */}
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-4">
                {day.description}
              </p>

              {/* Stops timeline */}
              {stops.length > 0 && (
                <div className="relative pl-6 border-l-2 border-[var(--primary)]/20 space-y-4 mb-4">
                  {stops.map((stop, i) => (
                    <div key={i} className="relative">
                      <div className="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full bg-[var(--primary)] border-2 border-white" />
                      <p className="text-[14px] font-semibold text-[var(--text-primary)]">{stop.name}</p>
                      <p className="text-[13px] text-[var(--text-tertiary)]">{stop.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Meta */}
              <div className="flex flex-wrap gap-4 text-[13px] text-[var(--text-tertiary)]">
                {day.drivingTime && (
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
                    </svg>
                    {day.drivingTime}
                  </span>
                )}
                {day.overnight && (
                  <span className="flex items-center gap-1">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                    </svg>
                    Overnight: {day.overnight}
                  </span>
                )}
              </div>
            </div>
          </AccordionItem>
        );
      })}
    </div>
  );
}
