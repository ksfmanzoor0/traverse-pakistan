import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { TourGrid } from "@/components/tours/TourGrid";
import { PackageCard } from "@/components/packages/PackageCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import { breadcrumbSchema } from "@/lib/seo/schema";
import { travelStyles } from "@/data/travel-styles";
import { getToursByStyle } from "@/services/tour.service";
import { getPackagesByStyle } from "@/services/package.service";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return travelStyles.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const style = travelStyles.find((s) => s.slug === slug);
  if (!style) {
    return buildMetadata({
      title: "Not Found",
      path: `/travel-styles/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: `${style.name} Tours in Pakistan`,
    description: `${style.description} Browse Pakistan ${style.name.toLowerCase()} tours with dual-city departures, expert guides, and 4.9-star reviews.`.slice(0, 160),
    path: `/travel-styles/${style.slug}`,
    tags: [style.name, "Pakistan tours", style.slug],
  });
}

export default async function TravelStyleDetailPage({ params }: Props) {
  const { slug } = await params;
  const style = travelStyles.find((s) => s.slug === slug);
  if (!style) notFound();

  const [packages, tours] = await Promise.all([
    getPackagesByStyle(slug),
    getToursByStyle(slug),
  ]);

  const schema = breadcrumbSchema([
    { name: "Home", url: "/" },
    { name: "Travel Styles", url: "/travel-styles" },
    { name: style.name, url: `/travel-styles/${style.slug}` },
  ]);

  return (
    <div className="py-8 sm:py-12">
      <JsonLd data={schema} id={`travel-style-${style.slug}-jsonld`} />
      <Container>
        <Breadcrumb
          items={[
            { label: "Travel Styles", href: "/travel-styles" },
            { label: style.name },
          ]}
        />
        <div className="mt-6 mb-10">
          <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight">
            {style.name}
          </h1>
          <p className="text-lg text-[var(--text-tertiary)] mt-2 max-w-2xl">
            {style.description}
          </p>
        </div>
        {packages.length > 0 && (
          <div className="mb-14">
            <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-6">
              Packages <span className="text-[var(--text-tertiary)] font-normal text-[18px]">({packages.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} variant="grid" />
              ))}
            </div>
          </div>
        )}

        {tours.length > 0 && (
          <div>
            <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-6">
              Group Tours <span className="text-[var(--text-tertiary)] font-normal text-[18px]">({tours.length})</span>
            </h2>
            <TourGrid tours={tours} />
          </div>
        )}
      </Container>
    </div>
  );
}
