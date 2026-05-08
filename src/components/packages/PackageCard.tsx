import Image from "next/image";
import Link from "next/link";
import { cn, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { Package } from "@/types/package";

interface PackageCardProps {
  pkg: Package;
  variant?: "carousel" | "grid";
  className?: string;
}

function pickImage(slug: string, images: Package["images"]) {
  if (!images.length) return null;
  const cover = images.find(img => /\/cover\./i.test(img.url));
  if (cover) return cover;
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) & 0xffff;
  return images[h % images.length];
}

export function PackageCard({ pkg, variant = "carousel", className }: PackageCardProps) {
  const heroImage = pickImage(pkg.slug, pkg.images);
  return (
    <Link
      href={`/packages/${pkg.slug}`}
      className={cn(
        "group flex flex-col rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-primary)]",
        "transition-all duration-[350ms] ease-[cubic-bezier(0.2,0,0,1)]",
        "hover:-translate-y-1 hover:shadow-[rgba(0,0,0,0.08)_0_4px_12px,rgba(0,0,0,0.04)_0_0_0_1px]",
        variant === "carousel"
          ? "min-w-[290px] w-[290px] sm:min-w-[310px] sm:w-[310px]"
          : "w-full",
        className
      )}
      style={{ boxShadow: "rgba(0,0,0,0.04) 0 0 0 1px, rgba(0,0,0,0.06) 0 2px 8px" }}
    >
      {/* Image */}
      <div className="relative aspect-[5/4] overflow-hidden">
        <Image
          src={heroImage?.url || "/placeholder.jpg"}
          alt={heroImage?.alt || pkg.name}
          fill
          className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.04]"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 310px"
        />
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/30 to-transparent" />

        {pkg.badge && (
          <div className="absolute top-3.5 left-3.5">
            <Badge type={pkg.badge} />
          </div>
        )}

        <div className="absolute top-3.5 right-3.5 flex gap-1.5">
          <span className="px-2 py-1 bg-black/40 backdrop-blur-md text-[var(--on-dark)] text-[10px] font-bold rounded-full border border-[var(--on-dark-border)] uppercase tracking-wide">
            Deluxe
          </span>
          <span className="px-2 py-1 bg-[var(--primary)]/80 backdrop-blur-md text-[var(--on-dark)] text-[10px] font-bold rounded-full uppercase tracking-wide">
            Luxury
          </span>
        </div>

        <div className="absolute bottom-3.5 left-3.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black/40 backdrop-blur-md text-[var(--on-dark)] text-[11px] font-semibold rounded-full tracking-[0.04em] uppercase border border-[var(--on-dark-border)]">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            {pkg.duration} days
          </span>
        </div>

        <div className="absolute bottom-3.5 right-3.5">
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-black/40 backdrop-blur-md text-[var(--primary-muted)] text-[10px] font-bold rounded-full border border-[var(--primary-muted)]/30 uppercase tracking-wide">
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Your dates
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--primary)]">
            Package
          </span>
          <div className="flex items-center gap-1">
            <Icon name="star" size="sm" weight="fill" color="var(--primary-muted)" />
            <span className="text-[13px] font-semibold text-[var(--text-primary)]">{pkg.rating}</span>
            <span className="text-[11px] text-[var(--text-tertiary)]">({pkg.reviewCount})</span>
          </div>
        </div>

        <h3 className="text-[16px] sm:text-[17px] font-bold text-[var(--text-primary)] leading-snug tracking-[-0.01em] group-hover:text-[var(--primary)] transition-colors duration-200 line-clamp-2">
          {pkg.name}
        </h3>

        <p className="text-[13px] text-[var(--text-tertiary)] mt-1.5 flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
          </svg>
          {pkg.route}
        </p>

        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2.5">
          {pkg.freeCancellation && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--success)]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              Free cancellation
            </span>
          )}
          {pkg.reserveNowPayLater && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-[var(--info)]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
              Pay later
            </span>
          )}
        </div>

        <div className="flex-1" />

        <div className="mt-3.5 pt-3.5 border-t border-[var(--border-default)]">
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[12px] text-[var(--text-tertiary)] font-medium">From</span>
              <span className="text-[18px] font-bold text-[var(--text-primary)] tabular-nums tracking-tight">
                {formatPrice(pkg.tiers.deluxe.islamabad ?? pkg.tiers.deluxe.lahore ?? pkg.tiers.deluxe.karachi ?? 0)}
              </span>
            </div>
            <span className="text-[11px] text-[var(--text-tertiary)]">per person</span>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            Luxury from {formatPrice(pkg.tiers.luxury.islamabad ?? pkg.tiers.luxury.lahore ?? pkg.tiers.luxury.karachi ?? 0)}
          </p>
        </div>
      </div>
    </Link>
  );
}
