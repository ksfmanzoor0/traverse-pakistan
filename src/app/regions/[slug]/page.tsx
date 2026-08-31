import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { GuideBlocks } from "@/components/destination/GuideBlocks";
import { TourCard } from "@/components/tours/TourCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  regionSchema,
  breadcrumbSchema,
  combineSchemas,
} from "@/lib/seo/schema";
import { getRegionBySlug, getAllRegions } from "@/services/region.service";
import { getDestinationsByRegion } from "@/services/destination.service";
import { getToursByRegion } from "@/services/tour.service";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const regions = await getAllRegions();
  return regions.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const region = await getRegionBySlug(slug);
  if (!region) {
    return buildMetadata({
      title: "Region Not Found",
      path: `/regions/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: region.metaTitle,
    description: region.metaDescription,
    path: `/regions/${region.slug}`,
    image: region.heroImage,
    imageAlt: `${region.name}, Pakistan`,
    tags: [region.name, "Pakistan", "tourism"],
    ctr: { year: new Date().getFullYear() },
  });
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const region = await getRegionBySlug(slug);
  if (!region) notFound();

  const [allInRegion, tours] = await Promise.all([
    getDestinationsByRegion(slug),
    getToursByRegion(slug),
  ]);

  // Show only top-level destinations in the region grid. Children (e.g. Altit,
  // Passu inside Hunza) show up as a subline on their parent's card and get
  // their own detail pages via /destinations/[slug].
  const parents = allInRegion.filter((d) => !d.parentSlug);
  const childrenByParent = new Map<string, string[]>();
  for (const d of allInRegion) {
    if (!d.parentSlug) continue;
    const list = childrenByParent.get(d.parentSlug) ?? [];
    list.push(d.name);
    childrenByParent.set(d.parentSlug, list);
  }

  const schema = combineSchemas(
    regionSchema(region),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Regions", url: "/destinations" },
      { name: region.name, url: `/regions/${region.slug}` },
    ])
  );

  return (
    <>
      <JsonLd data={schema} id={`region-${region.slug}-jsonld`} />
      {/* Hero */}
      <section className="relative h-[350px] sm:h-[420px] flex items-end">
        <Image
          src={region.heroImage}
          alt={region.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <Container className="relative pb-10 sm:pb-14">
          <Breadcrumb
            items={[
              { label: "Destinations", href: "/destinations" },
              { label: region.name },
            ]}
            light
            className="mb-4"
          />
          <h1 className="text-[36px] sm:text-[48px] font-bold text-[var(--on-dark)] tracking-tight">
            {region.name}
          </h1>
          <p className="text-lg text-[var(--on-dark-secondary)] mt-2 max-w-xl">{region.description}</p>
          <p className="text-[14px] text-[var(--on-dark-secondary)] mt-3">
            {region.tourCount} tours &middot; {parents.length} destinations
          </p>
        </Container>
      </section>

      {/* Destinations in this region — parents only. Children surface as a
          subline on the parent card and get their own detail pages. */}
      {parents.length > 0 && (
        <section className="py-16 sm:py-20">
          <Container>
            <SectionHeader title={`Destinations in ${region.name}`} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {parents.map((dest) => {
                const children = childrenByParent.get(dest.slug) ?? [];
                const visible = children.slice(0, 4);
                const extra = children.length - visible.length;
                return (
                  <Link
                    key={dest.id}
                    href={`/destinations/${dest.slug}`}
                    className="group relative rounded-xl overflow-hidden h-[280px] flex flex-col justify-end"
                  >
                    <Image
                      src={dest.heroImage}
                      alt={dest.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="relative p-5">
                      <h3 className="text-xl font-bold text-[var(--on-dark)]">{dest.name}</h3>
                      <p className="text-[14px] text-[var(--on-dark-secondary)] mt-1">
                        From {formatPrice(dest.startingPrice)} &middot; {dest.tourCount} tours
                      </p>
                      {visible.length > 0 && (
                        <p className="text-[12px] text-[var(--on-dark-secondary)] mt-1.5 line-clamp-1">
                          Includes {visible.join(" · ")}
                          {extra > 0 ? ` · +${extra} more` : ""}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </Container>
        </section>
      )}

      {/* Long-form regional guide (body_blocks). */}
      {(region.bodyBlocks?.length ?? 0) > 0 && (
        <section className="py-16 sm:py-20">
          <Container>
            <div className="max-w-4xl">
              <EyebrowLabel>Regional guide</EyebrowLabel>
              <h2 className="text-[28px] sm:text-[36px] font-bold tracking-[-0.02em] text-[var(--text-primary)] mt-2 mb-8">
                Travelling in {region.name}
              </h2>
              <GuideBlocks blocks={region.bodyBlocks ?? []} />
            </div>
          </Container>
        </section>
      )}

      {/* All tours in this region */}
      <section className="bg-[var(--bg-subtle)] py-16 sm:py-20">
        <Container>
          <SectionHeader
            title={`All Tours in ${region.name}`}
            subtitle={`${tours.length} tours to explore`}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tours.map((tour) => (
              <TourCard key={tour.id} tour={tour} variant="grid" />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
