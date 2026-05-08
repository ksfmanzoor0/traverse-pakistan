import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { Icon } from "@/components/ui/Icon";
import { TourCard } from "@/components/tours/TourCard";
import { PackageCard } from "@/components/packages/PackageCard";
import { AccordionItem } from "@/components/ui/Accordion";
import { JsonLd } from "@/components/seo/JsonLd";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { MomentCard } from "@/components/destination/MomentCard";
import { SeasonCard } from "@/components/destination/SeasonCard";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  destinationSchema,
  faqPageSchema,
  breadcrumbSchema,
  combineSchemas,
} from "@/lib/seo/schema";
import { formatPrice } from "@/lib/utils";
import {
  getDestinationBySlug,
  getAllDestinations,
  getFAQsByDestination,
} from "@/services/destination.service";
import { getToursByDestination } from "@/services/tour.service";
import { getPackagesByDestination } from "@/services/package.service";
import { getHotelsByDestination } from "@/services/hotel.service";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const dests = await getAllDestinations();
  return dests.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dest = await getDestinationBySlug(slug);
  if (!dest) {
    return buildMetadata({
      title: "Destination Not Found",
      path: `/destinations/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: dest.metaTitle,
    description: dest.metaDescription,
    path: `/destinations/${dest.slug}`,
    image: dest.heroImage,
    imageAlt: `${dest.name} — ${dest.subtitle}`,
    tags: [dest.name, dest.regionSlug, "Pakistan tourism"],
  });
}

export default async function DestinationDetailPage({ params }: Props) {
  const { slug } = await params;
  const dest = await getDestinationBySlug(slug);
  if (!dest) notFound();

  const ancestorSlugs = dest.ancestorSlugs ?? [];

  const [tours, faqs, pkgs, hotels, ...ancestorResults] = await Promise.all([
    getToursByDestination(slug),
    getFAQsByDestination(slug),
    getPackagesByDestination(slug),
    getHotelsByDestination(slug),
    ...ancestorSlugs.flatMap((a) => [
      getToursByDestination(a),
      getPackagesByDestination(a),
      getHotelsByDestination(a),
    ]),
  ]);

  const allTours = [...tours];
  const allPkgs = [...pkgs];
  const allHotels = [...hotels];
  for (let i = 0; i < ancestorSlugs.length; i++) {
    const aTours  = ancestorResults[i * 3 + 0] as typeof tours;
    const aPkgs   = ancestorResults[i * 3 + 1] as typeof pkgs;
    const aHotels = ancestorResults[i * 3 + 2] as typeof hotels;
    aTours.forEach((t) => { if (!allTours.some((e) => e.id === t.id)) allTours.push(t); });
    aPkgs.forEach((p) => { if (!allPkgs.some((e) => e.id === p.id)) allPkgs.push(p); });
    aHotels.forEach((h) => { if (!allHotels.some((e) => e.id === h.id)) allHotels.push(h); });
  }

  const schema = combineSchemas(
    destinationSchema(dest),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Destinations", url: "/destinations" },
      { name: dest.name, url: `/destinations/${dest.slug}` },
    ]),
    faqs.length > 0 ? faqPageSchema(faqs) : null
  );

  return (
    <>
      <JsonLd data={schema} id={`destination-${dest.slug}-jsonld`} />
      {/* Hero + description — image is shared background */}
      <section className="relative flex items-end min-h-[560px] sm:min-h-[640px]">
        <Image
          src={dest.heroImage}
          alt={dest.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority
          quality={80}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
        <Container className="relative pb-10 sm:pb-14 pt-24">
          <Breadcrumb
            items={[
              { label: "Destinations", href: "/destinations" },
              { label: dest.name },
            ]}
            light
            className="mb-4"
          />
          <h1 className="text-[36px] sm:text-[48px] font-bold text-[var(--on-dark)] tracking-tight">
            {dest.name}
          </h1>
          <p className="text-lg text-[var(--on-dark-secondary)] mt-2 max-w-xl">{dest.subtitle}</p>
          <div className="flex items-center gap-x-5 gap-y-2 flex-wrap mt-4 text-[14px] text-[var(--on-dark-secondary)]">
            <span>{dest.tourCount} tours available</span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="star" size="sm" weight="fill" color="var(--primary-muted)" />
              <span>{dest.rating} rating</span>
            </span>
            <span>From {formatPrice(dest.startingPrice)}</span>
          </div>
          {dest.description && (
            <div className="mt-5 pt-5 border-t border-white/20 max-w-2xl">
              <ExpandableText text={dest.description} onDarkBg />
            </div>
          )}
        </Container>
      </section>

      {/* Packages */}
      {allPkgs.length > 0 && (
        <section className="py-16 sm:py-20 bg-[var(--bg-subtle)]">
          <Container>
            <SectionHeader
              title={`Packages in ${dest.name}`}
              subtitle={`${allPkgs.length} flexible package${allPkgs.length !== 1 ? "s" : ""} — your dates, your tier`}
              linkText="View all packages"
              linkHref="/packages"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allPkgs.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} variant="grid" />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Tours */}
      {allTours.length > 0 && (
        <section className="py-16 sm:py-20">
          <Container>
            <SectionHeader
              title={`Group Tours in ${dest.name}`}
              subtitle={`${allTours.length} tour${allTours.length !== 1 ? "s" : ""} to choose from`}
              linkText="View all group tours"
              linkHref="/grouptours"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allTours.map((tour) => (
                <TourCard key={tour.id} tour={tour} variant="grid" />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Hotels */}
      {allHotels.length > 0 && (
        <section className="py-16 sm:py-20 bg-[var(--bg-subtle)]">
          <Container>
            <SectionHeader
              title={`Where to Stay in ${dest.name}`}
              subtitle={`${allHotels.length} hotel${allHotels.length !== 1 ? "s" : ""} & properties`}
              linkText="View all hotels"
              linkHref="/hotels"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {allHotels.map((hotel) => (
                <Link
                  key={hotel.id}
                  href={`/hotels/${hotel.slug}`}
                  className="group rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-primary)] transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)] hover:-translate-y-1"
                  style={{ boxShadow: "var(--shadow-sm)" }}
                >
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <Image
                      src={hotel.image}
                      alt={hotel.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-[var(--primary)] text-[var(--on-dark)] rounded-[var(--radius-full)]">
                        {hotel.tier === "luxury" ? "LUXURY" : hotel.tier === "premium" ? "PREMIUM" : hotel.tier === "standard" ? "CAMP" : "DELUXE"}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                        {hotel.propertyType}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[13px]">
                        <Icon name="star" size="sm" weight="fill" color="var(--primary-muted)" />
                        <span className="font-semibold text-[var(--text-primary)]">{hotel.rating}</span>
                      </span>
                    </div>
                    <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                      {hotel.name}
                    </h3>
                    <p className="text-[12px] text-[var(--text-tertiary)] mt-1">{hotel.location}</p>
                    <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
                      <span className="text-[17px] font-bold text-[var(--text-primary)] tabular-nums">
                        {formatPrice(hotel.pricePerNight)}
                      </span>
                      <span className="text-[12px] text-[var(--text-tertiary)]"> / night</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* Moments — the softer "why visit" */}
      {dest.whyVisitCards.length > 0 && (
        <section className="py-16 sm:py-20">
          <Container>
            <div className="max-w-[1000px] mx-auto">
              <div className="flex flex-col gap-2 mb-10">
                <EyebrowLabel>Why here</EyebrowLabel>
                <h2
                  className="font-bold tracking-[-0.025em] leading-[1.15] text-[var(--text-primary)]"
                  style={{ fontSize: "var(--text-4xl)" }}
                >
                  Moments in {dest.name}
                </h2>
                <p
                  className="mt-1 max-w-xl leading-relaxed text-[var(--text-secondary)]"
                  style={{ fontSize: "var(--text-lg)" }}
                >
                  The small, specific reasons travellers keep coming back.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {dest.whyVisitCards.map((card) => (
                  <MomentCard
                    key={card.title}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                  />
                ))}
              </div>
            </div>
          </Container>
        </section>
      )}

      {/* Seasons — with seasonal tinting */}
      {dest.seasons.length > 0 && (
        <section className="py-16 sm:py-20 bg-[var(--bg-subtle)]">
          <Container>
            <div className="flex flex-col items-center text-center gap-2 mb-10">
              <EyebrowLabel>Four chapters</EyebrowLabel>
              <h2
                className="font-bold tracking-[-0.025em] leading-[1.15] text-[var(--text-primary)]"
                style={{ fontSize: "var(--text-4xl)" }}
              >
                Best Time to Visit
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-[1000px] mx-auto">
              {dest.seasons.map((s) => (
                <SeasonCard key={s.season} info={s} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="py-16 sm:py-20">
          <Container>
            <SectionHeader title="Frequently Asked Questions" center />
            <div className="max-w-[800px] mx-auto bg-[var(--bg-elevated)] rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} title={faq.question} className="px-6">
                  {faq.answer}
                </AccordionItem>
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
