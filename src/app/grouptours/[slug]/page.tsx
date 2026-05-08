import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Chip } from "@/components/ui/Chip";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";
import { MosaicGallery } from "@/components/trip-detail/MosaicGallery";
import { BookingSidebar } from "@/components/trip-detail/BookingSidebar";
import { ItineraryAccordion } from "@/components/trip-detail/ItineraryAccordion";
import { MobileReserveBar } from "@/components/booking/MobileReserveBar";
import { TourCard } from "@/components/tours/TourCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  tourSchema,
  breadcrumbSchema,
  combineSchemas,
} from "@/lib/seo/schema";
import {
  getTourBySlug,
  getAllTours,
  getSimilarTours,
  getItineraryByTourSlug,
} from "@/services/tour.service";
import { getReviewsByTour } from "@/services/review.service";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const tours = await getAllTours();
  return tours.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tour = await getTourBySlug(slug);
  if (!tour) {
    return buildMetadata({
      title: "Tour Not Found",
      path: `/grouptours/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: tour.metaTitle,
    description: tour.metaDescription,
    path: `/grouptours/${tour.slug}`,
    image: tour.images[0]?.url,
    imageAlt: tour.images[0]?.alt,
    type: "product",
    tags: [...tour.travelStyleSlugs, tour.destinationSlug, tour.regionSlug],
  });
}

export default async function TripDetailPage({ params }: Props) {
  const { slug } = await params;
  const tour = await getTourBySlug(slug);
  if (!tour) notFound();

  const [itinerary, reviews, similarTours] = await Promise.all([
    getItineraryByTourSlug(slug),
    getReviewsByTour(slug),
    getSimilarTours(slug, 4),
  ]);

  const schema = combineSchemas(
    tourSchema(tour),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Group Tours", url: "/grouptours" },
      { name: tour.name, url: `/grouptours/${tour.slug}` },
    ])
  );

  return (
    <div className="pt-0 sm:pt-6 pb-24 sm:pb-8">
      <JsonLd data={schema} id={`tour-${tour.slug}-jsonld`} />
      <Container>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Group Tours", href: "/grouptours" },
            { label: tour.name },
          ]}
        />

        {/* Gallery */}
        <div className="mt-1 sm:mt-5">
          <MosaicGallery images={tour.images} tourName={tour.name} />
        </div>

        {/* Two-column layout */}
        <div className="mt-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
          {/* Content */}
          <div>
            {/* Title section */}
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--primary)]">
                {tour.category.replace("-", " ")}
              </span>
              <h1 className="text-[28px] sm:text-[34px] font-bold text-[var(--text-primary)] tracking-tight mt-1">
                {tour.name}
              </h1>
              <div className="mt-3">
                <StarRating
                  rating={tour.rating}
                  reviewCount={tour.reviewCount}
                  size="md"
                />
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <Chip icon={<Icon name="calendar" size="sm" />}>{tour.duration} days</Chip>
                <Chip icon={<Icon name="users" size="sm" />}>Up to {tour.maxGroupSize} people</Chip>
                <Chip icon={<Icon name="globe" size="sm" />}>{tour.languages.join(", ")}</Chip>
                {tour.freeCancellation && (
                  <Chip variant="success" icon={<Icon name="check" size="sm" weight="bold" />}>
                    Free cancellation
                  </Chip>
                )}
                {tour.reserveNowPayLater && (
                  <Chip variant="info" icon={<Icon name="credit-card" size="sm" />}>
                    Reserve now, pay later
                  </Chip>
                )}
              </div>
            </div>

            {/* Overview */}
            <section className="mt-10 pt-8 border-t border-[var(--border-default)]" id="overview">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-4">Overview</h2>
              <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                {tour.description}
              </p>

              {/* Highlights */}
              {tour.highlights.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">
                    Highlights
                  </h3>
                  <ul className="space-y-2">
                    {tour.highlights.map((h, i) => (
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

            {/* Itinerary */}
            {itinerary && (
              <section className="mt-10 pt-8 border-t border-[var(--border-default)]" id="itinerary">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
                  Day-by-Day Itinerary
                </h2>
                <ItineraryAccordion days={itinerary.days} />
              </section>
            )}

            {/* Inclusions */}
            <section className="mt-10 pt-8 border-t border-[var(--border-default)]" id="inclusions">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
                What&apos;s Included
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-[var(--primary)] mb-3">
                    Included
                  </h3>
                  <ul className="space-y-2">
                    {tour.inclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14px] text-[var(--text-secondary)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0 mt-0.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-[var(--warning)] mb-3">
                    Not Included
                  </h3>
                  <ul className="space-y-2">
                    {tour.exclusions.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14px] text-[var(--text-secondary)]">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" className="shrink-0 mt-0.5">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Know before you go */}
              {tour.knowBeforeYouGo.length > 0 && (
                <div className="mt-8 p-5 bg-[var(--accent-warm-light)] border border-[var(--accent-warm)]/30 rounded-xl">
                  <h3 className="text-[14px] font-bold text-[var(--accent-warm)] mb-3 flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    Know Before You Go
                  </h3>
                  <ul className="space-y-1.5">
                    {tour.knowBeforeYouGo.map((item, i) => (
                      <li key={i} className="text-[14px] text-[var(--text-secondary)] flex items-start gap-2">
                        <span className="shrink-0 mt-1 text-[var(--accent-warm)]">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* Meeting & Pickup */}
            <section className="mt-10 pt-8 border-t border-[var(--border-default)]" id="meeting">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
                Meeting & Pickup
              </h2>
              <div className="space-y-4 text-[14px] text-[var(--text-secondary)]">
                <div className="flex items-start gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0 mt-0.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Meeting Point</p>
                    <p>{tour.meetingPoint.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0 mt-0.5">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Departure Time</p>
                    <p>{tour.meetingPoint.departureTime}</p>
                  </div>
                </div>
                <p className="text-[var(--text-tertiary)]">{tour.meetingPoint.arrivalInstruction}</p>
                {tour.meetingPoint.pickupOffered && (
                  <p className="text-[var(--primary)] font-medium inline-flex items-center gap-1.5">
                    <Icon name="check" size="sm" weight="bold" /> {tour.meetingPoint.pickupDescription}
                  </p>
                )}
              </div>
            </section>

            {/* Reviews */}
            {reviews.length > 0 && (
              <section className="mt-10 pt-8 border-t border-[var(--border-default)]" id="reviews">
                <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">
                  Reviews ({reviews.length})
                </h2>
                <div className="space-y-5">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-5 bg-[var(--bg-subtle)] rounded-xl"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-deep)] flex items-center justify-center text-[var(--text-inverse)] text-[14px] font-bold">
                          {review.initial}
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                            {review.name}
                          </p>
                          <p className="text-[12px] text-[var(--text-tertiary)]">
                            {review.travelerType}
                          </p>
                        </div>
                        <div className="ml-auto flex gap-0.5" aria-label={`${review.rating} out of 5`}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Icon
                              key={i}
                              name="star"
                              size="sm"
                              weight={i < review.rating ? "fill" : "regular"}
                              color={i < review.rating ? "var(--primary-muted)" : "var(--border-default)"}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                        {review.text}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <aside className="hidden lg:block">
            <BookingSidebar tour={tour} reviews={reviews.slice(0, 3)} />
          </aside>
        </div>

        {/* Mobile reserve bar with full wizard sheet */}
        <MobileReserveBar tour={tour} reviews={reviews.slice(0, 3)} />

        {/* Similar tours */}
        {similarTours.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[var(--border-default)]">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">
              You Might Also Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {similarTours.map((t) => (
                <TourCard key={t.id} tour={t} variant="grid" />
              ))}
            </div>
          </section>
        )}
      </Container>
    </div>
  );
}
