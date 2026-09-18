import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";
import { PackagesClient } from "@/components/packages/PackagesClient";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllPackages } from "@/services/package.service";
import { getDestinationOptions } from "@/services/destination.service";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, itemListSchema, combineSchemas } from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: "Pakistan Holiday Packages — Custom Dates, Deluxe & Luxury Tiers",
  description:
    "Custom-date holiday packages across Pakistan. Choose Deluxe or Luxury, travel with expert guides and hand-picked hotels in Hunza, Skardu, Chitral, and beyond.",
  path: "/packages",
  tags: ["Pakistan holiday package", "custom tour", "luxury Pakistan tour"],
});

export default async function PackagesPage() {
  const [packages, destinations] = await Promise.all([
    getAllPackages(),
    getDestinationOptions().catch(() => []),
  ]);

  const schema = combineSchemas(
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Packages", url: "/packages" },
    ]),
    itemListSchema({
      name: "Pakistan Holiday Packages",
      path: "/packages",
      items: packages.map((i) => ({ name: i.name, path: `/packages/${i.slug}` })),
    })
  );

  return (
    <div className="pb-12">
      <JsonLd data={schema} id="packages-jsonld" />
      <div className="py-4 sm:py-10 border-b border-[var(--border-default)]">
        <Container>
          <Breadcrumb items={[{ label: "Packages" }]} />
          <div className="mt-2 sm:mt-4">
            <EyebrowLabel className="mb-2">Design Your Dream Journey</EyebrowLabel>
            <h1 className="text-[22px] sm:text-[42px] font-semibold sm:font-bold text-[var(--text-primary)] tracking-[-0.015em] sm:tracking-[-0.025em] leading-[1.15]">
              Pakistan Tour Packages
            </h1>
            <p className="mt-1.5 text-[15px] sm:text-lg text-[var(--text-secondary)]">
              Tailor Made tours — Your dates, Your tier!
            </p>
          </div>
        </Container>
      </div>

      <Suspense fallback={<div className="py-20 text-center text-[var(--text-tertiary)]">Loading…</div>}>
        <PackagesClient packages={packages} destinations={destinations} />
      </Suspense>
    </div>
  );
}
