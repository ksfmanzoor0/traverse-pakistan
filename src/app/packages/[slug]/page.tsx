import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PackageDetailClient } from "@/components/packages/PackageDetailClient";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  packageSchema,
  breadcrumbSchema,
  combineSchemas,
} from "@/lib/seo/schema";
import { getAllPackages, getPackageBySlug, getPackageItinerary } from "@/services/package.service";
import { TrackView } from "@/components/analytics/TrackView";
import { getAllHotels } from "@/services/hotel.service";
import type { Hotel } from "@/types/hotel";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const packages = await getAllPackages();
  return packages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) {
    return buildMetadata({
      title: "Package Not Found",
      path: `/packages/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: pkg.metaTitle,
    description: pkg.metaDescription,
    path: `/packages/${pkg.slug}`,
    image: pkg.images[0]?.url,
    imageAlt: pkg.images[0]?.alt || pkg.name,
    type: "product",
    tags: [pkg.destinationSlug, pkg.regionSlug, "Pakistan holiday package"],
  });
}

export default async function PackageDetailPage({ params }: Props) {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) notFound();

  const [itinerary, allHotels, allPackages] = await Promise.all([
    getPackageItinerary(slug),
    getAllHotels(),
    getAllPackages(),
  ]);

  // Build hotels lookup map
  const hotelsMap: Record<string, Hotel> = {};
  for (const hotel of allHotels) {
    hotelsMap[hotel.slug] = hotel;
  }

  const relatedPackages = allPackages.filter((p) => p.slug !== slug);

  const schema = combineSchemas(
    packageSchema(pkg),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Holiday Packages", url: "/packages" },
      { name: pkg.name, url: `/packages/${pkg.slug}` },
    ])
  );

  const fromPrice = pkg.tiers?.deluxe?.islamabad ?? pkg.tiers?.deluxe?.lahore ?? null;

  return (
    <>
      <JsonLd data={schema} id={`package-${pkg.slug}-jsonld`} />
      <TrackView itemId={pkg.slug} itemName={pkg.name} bookingType="package" price={fromPrice} />
      <PackageDetailClient
        pkg={pkg}
        itinerary={itinerary}
        hotelsMap={hotelsMap}
        relatedPackages={relatedPackages}
      />
    </>
  );
}
