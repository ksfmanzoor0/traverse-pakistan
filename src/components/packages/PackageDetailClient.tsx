"use client";

import { useState } from "react";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";
import { MosaicGallery } from "@/components/trip-detail/MosaicGallery";
import { PackageBookingSidebar } from "@/components/packages/PackageBookingSidebar";
import { PackageItineraryAccordion } from "@/components/packages/PackageItineraryAccordion";
import { PackageCard } from "@/components/packages/PackageCard";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import type { Package, PackageItinerary, PackageTier } from "@/types/package";
import type { Hotel } from "@/types/hotel";

interface PackageDetailClientProps {
  pkg: Package;
  itinerary: PackageItinerary | null;
  hotelsMap: Record<string, Hotel>;
  relatedPackages: Package[];
}

export function PackageDetailClient({ pkg, itinerary, hotelsMap, relatedPackages }: PackageDetailClientProps) {
  const [selectedTier, setSelectedTier] = useState<PackageTier>("deluxe");
  const [departureCity, setDepartureCity] = useState<"islamabad" | "lahore" | "karachi">(
    pkg.tiers.deluxe.islamabad !== null ? "islamabad" : pkg.tiers.deluxe.lahore !== null ? "lahore" : "karachi"
  );

  return (
    <div className="pt-0 sm:pt-6 pb-24 sm:pb-8">
      <Container>
        <Breadcrumb items={[{ label: "Packages", href: "/packages" }, { label: pkg.name }]} />

        {/* Gallery */}
        <div className="mt-1 sm:mt-5">
          <MosaicGallery images={pkg.images} tourName={pkg.name} />
        </div>

        {/* Two-column layout */}
        <div className="mt-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
          {/* Content */}
          <div>
            {/* Title */}
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--primary)]">
                Flexible Package
              </span>
              <h1 className="text-[28px] sm:text-[34px] font-bold text-[var(--text-primary)] tracking-tight mt-1">
                {pkg.name}
              </h1>
              <div className="mt-3">
                <StarRating rating={pkg.rating} reviewCount={pkg.reviewCount} size="md" />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Chip icon={<Icon name="calendar" size="sm" />}>{pkg.duration} days</Chip>
                <Chip icon={<Icon name="users" size="sm" />}>Up to {pkg.maxGroupSize} people</Chip>
                <Chip icon={<Icon name="globe" size="sm" />}>{pkg.languages.join(", ")}</Chip>
                <Chip icon={<Icon name="calendar-check" size="sm" />}>Custom dates</Chip>
                {pkg.freeCancellation && (
                  <Chip variant="success" icon={<Icon name="check" size="sm" weight="bold" />}>Free cancellation</Chip>
                )}
                {pkg.reserveNowPayLater && (
                  <Chip variant="info" icon={<Icon name="credit-card" size="sm" />}>Reserve now, pay later</Chip>
                )}
              </div>
            </div>

            {/* Tier + city selector — inline for mobile */}
            <div className="mt-6 lg:hidden p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--border-default)] space-y-4">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Choose Your Tier</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["deluxe", "luxury"] as PackageTier[]).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setSelectedTier(tier)}
                      className={`h-10 rounded-[var(--radius-sm)] text-[13px] font-semibold border transition-colors cursor-pointer ${
                        selectedTier === tier
                          ? "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary)]"
                          : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)]"
                      }`}
                    >
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      {" · "}{formatPrice(pkg.tiers[tier].islamabad ?? pkg.tiers[tier].lahore ?? 0)}
                    </button>
                  ))}
                </div>
              </div>
              {(() => { const cities = (["islamabad", "lahore", "karachi"] as const).filter(c => pkg.tiers[selectedTier][c] !== null); return cities.length > 1; })() && (
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-3">Starting Location</p>
                  <div className={`grid gap-2 ${(["islamabad", "lahore", "karachi"] as const).filter(c => pkg.tiers[selectedTier][c] !== null).length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
                    {(["islamabad", "lahore", "karachi"] as const)
                      .filter((city) => pkg.tiers[selectedTier][city] !== null)
                      .map((city) => (
                        <button
                          key={city}
                          type="button"
                          onClick={() => setDepartureCity(city)}
                          className={`h-10 rounded-[var(--radius-sm)] text-[13px] font-semibold border transition-colors cursor-pointer capitalize ${
                            departureCity === city
                              ? "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary)]"
                              : "bg-[var(--bg-primary)] text-[var(--text-secondary)] border-[var(--border-default)]"
                          }`}
                        >
                          {city.charAt(0).toUpperCase() + city.slice(1)}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Overview */}
            <section className="mt-10 pt-8 border-t border-[var(--border-default)]" id="overview">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Overview</h2>
              <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">{pkg.description}</p>
              {pkg.highlights.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">Highlights</h3>
                  <ul className="space-y-2">
                    {pkg.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-3 text-[14px] text-[var(--text-secondary)]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Itinerary with hotel cards */}
            {itinerary && (
              <section className="mt-10 pt-8 border-t border-[var(--border-default)]" id="itinerary">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">Day-by-Day Itinerary</h2>
                  <div className="hidden sm:flex items-center gap-2 text-[13px] text-[var(--text-tertiary)]">
                    <span>Hotels:</span>
                    {(["deluxe", "luxury"] as PackageTier[]).map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setSelectedTier(tier)}
                        className={`px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors cursor-pointer ${
                          selectedTier === tier
                            ? "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary)]"
                            : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--primary)]"
                        }`}
                      >
                        {tier.charAt(0).toUpperCase() + tier.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <PackageItineraryAccordion
                  days={itinerary.days}
                  selectedTier={selectedTier}
                  hotelsMap={hotelsMap}
                  departureCity={departureCity}
                />
              </section>
            )}

            {/* Inclusions */}
            <section className="mt-10 pt-8 border-t border-[var(--border-default)]" id="inclusions">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">What&apos;s Included</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-[var(--primary)] mb-3">Included</h3>
                  <ul className="space-y-2">
                    {pkg.inclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14px] text-[var(--text-secondary)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12" /></svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-[var(--warning)] mb-3">Not Included</h3>
                  <ul className="space-y-2">
                    {pkg.exclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14px] text-[var(--text-secondary)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" className="shrink-0 mt-0.5">
                          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {pkg.knowBeforeYouGo.length > 0 && (
                <div className="mt-8 p-5 bg-[var(--accent-warm-light)] border border-[var(--accent-warm)]/30 rounded-xl">
                  <h3 className="text-[14px] font-bold text-[var(--accent-warm)] mb-3 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Know Before You Go
                  </h3>
                  <ul className="space-y-1.5">
                    {pkg.knowBeforeYouGo.map((item, i) => (
                      <li key={i} className="text-[14px] text-[var(--text-secondary)] flex items-start gap-2">
                        <span className="shrink-0 mt-1 text-[var(--accent-warm)]">•</span>{item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <PackageBookingSidebar pkg={pkg} selectedTier={selectedTier} onTierChange={setSelectedTier} departureCity={departureCity} onDepartureCityChange={(c) => setDepartureCity(c)} />
          </aside>
        </div>

        {/* Mobile sticky bar */}
        <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 bg-[var(--bg-primary)] border-t border-[var(--border-default)] px-5 py-3 flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-[var(--text-primary)]">
              {formatPrice(pkg.tiers[selectedTier][departureCity] ?? pkg.tiers[selectedTier].islamabad ?? pkg.tiers[selectedTier].lahore ?? 0)}
            </span>
            <span className="text-[13px] text-[var(--text-tertiary)] ml-1">per person</span>
          </div>
          <Link
            href={`/packages/${pkg.slug}/checkout`}
            className="h-11 px-6 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-full flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors"
          >
            Book Now
          </Link>
        </div>

        {/* Related packages */}
        {relatedPackages.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[var(--border-default)]">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">More Packages</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {relatedPackages.map((p) => (
                <PackageCard key={p.id} pkg={p} variant="grid" />
              ))}
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}
