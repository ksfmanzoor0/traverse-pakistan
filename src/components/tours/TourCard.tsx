import Image from "next/image";
import Link from "next/link";
import { cn, formatPrice, getSavedCountForSlug } from "@/lib/utils";
import { WishlistButton } from "@/components/ui/WishlistButton";
import type { Tour } from "@/types/tour";

interface TourCardProps {
  tour: Tour;
  variant?: "carousel" | "grid";
  className?: string;
}

const badgeConfig: Record<string, { label: string; className: string }> = {
  bestseller: { label: "Top Seller", className: "bg-[var(--primary)] text-[var(--text-inverse)]" },
  "on-sale":  { label: "On Sale",   className: "bg-[var(--accent-warm)] text-[var(--text-inverse)]" },
  "epic-trek":{ label: "Epic Trek", className: "bg-[var(--primary-deep)] text-[var(--text-inverse)]" },
  new:        { label: "New",       className: "bg-[var(--info)] text-[var(--text-inverse)]" },
};

export function TourCard({ tour, variant = "carousel", className }: TourCardProps) {
  const routeStops = tour.route.split(/\s*→\s*/);
  const startingCity = routeStops[0];
  const endCity = routeStops[routeStops.length - 1];
  const uniqueStops = [...new Set(routeStops)];
  const destTooltip = uniqueStops.join(", ");
  const routeLabel = startingCity === endCity
    ? `${startingCity} to ${startingCity}`
    : `${startingCity} to ${endCity}`;

  const discount = tour.originalPrice
    ? Math.round((1 - tour.pricing.islamabad / tour.originalPrice) * 100)
    : null;

  const badge = tour.badge ? badgeConfig[tour.badge] : null;
  const savedCount = getSavedCountForSlug(
    tour.slug,
    Math.round((tour.rating - 4) * 80) + Math.min(tour.reviewCount / 6, 60)
  );

  const departureDate = tour.departureDate
    ? new Date(tour.departureDate).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    : null;

  return (
    <Link
      href={`/grouptours/${tour.slug}`}
      className={cn(
        "group flex flex-col rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-primary)]",
        "transition-all duration-[350ms] ease-[cubic-bezier(0.2,0,0,1)] hover:-translate-y-1",
        variant === "carousel"
          ? "min-w-[261px] w-[261px] sm:min-w-[320px] sm:w-[320px]"
          : "w-full",
        className
      )}
      style={{ boxShadow: "rgba(0,0,0,0.04) 0 0 0 1px, rgba(0,0,0,0.08) 0 2px 10px" }}
    >
      {/* Image — landscape */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={tour.images[0]?.url || "/placeholder.jpg"}
          alt={tour.images[0]?.alt || tour.name}
          fill
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 261px, (max-width: 1024px) 50vw, 320px"
        />

        {/* Badge — top left (frees top-right for wishlist + FOMO) */}
        {badge && (
          <div className="absolute top-3 left-3">
            <span className={cn("px-2.5 py-1 text-[11px] font-bold rounded-full tracking-wide uppercase shadow-sm", badge.className)}>
              {badge.label}
            </span>
          </div>
        )}

        {/* Wishlist + social-proof saved count — top right */}
        <div className="absolute top-3 right-3">
          <WishlistButton savedCount={savedCount} />
        </div>

        {/* Quick View — bottom left on hover */}
        <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-[var(--radius-sm)] shadow-md backdrop-blur-sm"
            style={{ background: "rgba(255,255,255,0.94)", color: "var(--primary-deep)" }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
            </svg>
            Quick View
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 px-4 pt-3 pb-4">
        {/* Category */}
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--text-tertiary)] mb-1">
          {tour.category.replace(/-/g, " ")}
        </span>

        {/* Name */}
        <h3 className="text-[15px] font-bold text-[var(--text-primary)] leading-snug group-hover:text-[var(--primary)] transition-colors duration-200 line-clamp-2 mb-1.5">
          {tour.name}
        </h3>

        {/* Rating + review count — trust signal */}
        {tour.rating > 0 && (
          <div className="flex items-center gap-1 text-[12px] mb-2">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--primary)" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            <span className="font-semibold text-[var(--text-primary)] tabular-nums">{tour.rating.toFixed(1)}</span>
            <span className="text-[var(--text-tertiary)]">·</span>
            <span className="text-[var(--text-tertiary)]">{tour.reviewCount.toLocaleString()} reviews</span>
          </div>
        )}

        {/* Duration + Route */}
        <div className="flex items-center gap-3 text-[12px] text-[var(--text-secondary)] mb-1.5">
          <span className="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-tertiary)]">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {tour.duration} days
          </span>
          <span className="relative group/dest flex items-center gap-1 cursor-default">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-tertiary)]">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="border-b border-dashed border-[var(--border-default)]">{routeLabel}</span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-1.5 z-10 invisible group-hover/dest:visible opacity-0 group-hover/dest:opacity-100 transition-all duration-200 pointer-events-none">
              <div className="bg-[var(--bg-darker)] text-white text-[11px] px-3 py-2 rounded-lg shadow-xl whitespace-nowrap">
                {destTooltip}
                <div className="absolute top-full left-3 border-4 border-transparent border-t-[var(--bg-darker)]" />
              </div>
            </div>
          </span>
        </div>

        {/* Guide credibility — Airbnb-style trust anchor */}
        <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-tertiary)] mb-2">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="var(--primary)" stroke="none" aria-hidden="true">
            <path d="M9 12l2 2 4-4" stroke="var(--text-inverse)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M12 1l3 2h3l1 3 3 1-1 3 1 3-3 1-1 3h-3l-3 2-3-2H5l-1-3-3-1 1-3-1-3 3-1 1-3h3z" fill="var(--primary)" stroke="none" />
            <path d="M9 12l2 2 4-4" stroke="var(--text-inverse)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>
            {tour.guide
              ? <>Guided by <span className="font-semibold text-[var(--text-secondary)]">{tour.guide.name}</span> · {tour.guide.yearsGuiding} yrs</>
              : <>Expert local guide · <span className="font-semibold text-[var(--text-secondary)]">Verified</span></>}
          </span>
        </div>

        <div className="flex-1" />

        {/* Price row */}
        <div className="flex items-end justify-between gap-2 pt-2.5 border-t border-[var(--border-default)]">
          <div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[18px] font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
                {formatPrice(tour.pricing.islamabad)}
              </span>
              {tour.originalPrice && (
                <span className="text-[12px] text-[var(--text-tertiary)]">
                  <span className="line-through">{formatPrice(tour.originalPrice)}</span>
                  {discount && (
                    <span className="ml-1 px-1.5 py-0.5 bg-[var(--accent-warm)] text-[var(--text-inverse)] text-[10px] font-bold rounded align-middle">
                      -{discount}%
                    </span>
                  )}
                </span>
              )}
            </div>
            {departureDate && (
              <p className="text-[11px] text-[var(--text-tertiary)] italic mt-0.5">
                Departs on {departureDate}
              </p>
            )}
          </div>

          <span className="shrink-0 px-4 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--text-inverse)] text-[12px] font-bold rounded-lg transition-colors">
            View tour
          </span>
        </div>
      </div>
    </Link>
  );
}
