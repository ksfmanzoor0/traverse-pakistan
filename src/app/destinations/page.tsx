import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Icon } from "@/components/ui/Icon";
import { buildMetadata } from "@/lib/seo/metadata";
import { formatPrice } from "@/lib/utils";
import { getAllDestinations } from "@/services/destination.service";
import { getAllPackages } from "@/services/package.service";
import { getAllTours } from "@/services/tour.service";
import { countDestinationOfferings } from "@/lib/destinations/countOfferings";

export const metadata: Metadata = buildMetadata({
  title: "Pakistan Destinations — Hunza, Skardu, Chitral, Kalash & More",
  description:
    "Explore every major destination in Pakistan: Hunza, Skardu, Chitral, Kalash Valley, Fairy Meadows, Naltar, Deosai. Curated guides, tours, and hotels.",
  path: "/destinations",
  tags: ["Pakistan destinations", "Hunza", "Skardu", "Chitral", "Kalash"],
});

export default async function DestinationsPage() {
  const [destinations, allPackages, allTours] = await Promise.all([
    getAllDestinations(),
    getAllPackages(),
    getAllTours(),
  ]);

  const { packageCountBySlug, tourCountBySlug } = countDestinationOfferings(
    destinations,
    allPackages,
    allTours,
  );

  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "Destinations" }]} />
        <div className="mt-6 mb-10">
          <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight">
            Explore Destinations
          </h1>
          <p className="text-lg text-[var(--text-tertiary)] mt-2 max-w-2xl">
            From the peaks of Karakoram to the beaches of Makran — discover Pakistan&apos;s most stunning regions
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((dest) => {
            const pkgCount = packageCountBySlug.get(dest.slug) ?? 0;
            const tourCount = tourCountBySlug.get(dest.slug) ?? 0;
            const parts: string[] = [];
            if (dest.startingPrice > 0) parts.push(`From ${formatPrice(dest.startingPrice)}`);
            if (pkgCount > 0) parts.push(`${pkgCount} package${pkgCount !== 1 ? "s" : ""}`);
            else if (tourCount > 0) parts.push(`${tourCount} tour${tourCount !== 1 ? "s" : ""}`);
            return (
              <Link
                key={dest.id}
                href={`/destinations/${dest.slug}`}
                className="group relative rounded-xl overflow-hidden h-[320px] flex flex-col justify-end"
              >
                <Image
                  src={dest.heroImage}
                  alt={dest.name}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="relative p-6">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--primary-muted)]">
                    {dest.regionSlug.replace("-", " ")}
                  </span>
                  <h2 className="text-2xl font-bold text-[var(--on-dark)] mt-1">{dest.name}</h2>
                  <p className="text-[14px] text-[var(--on-dark-secondary)] mt-1 inline-flex items-center gap-1.5">
                    <span>{parts.join(" · ")}</span>
                    <span className="inline-flex items-center gap-1">
                      <Icon name="star" size="sm" weight="fill" color="var(--primary-muted)" />
                      {dest.rating}
                    </span>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </div>
  );
}
