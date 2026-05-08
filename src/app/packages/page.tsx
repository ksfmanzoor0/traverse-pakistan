import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { PackagesClient } from "@/components/packages/PackagesClient";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllPackages } from "@/services/package.service";
import { getDestinationOptions } from "@/services/destination.service";

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

  return (
    <div className="pb-12">
      <div className="py-8 sm:py-10 border-b border-[var(--border-default)]">
        <Container>
          <Breadcrumb items={[{ label: "Packages" }]} />
          <div className="mt-4">
            <span className="text-[13px] font-bold uppercase tracking-wider text-[var(--primary)]">Flexible Packages</span>
            <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight mt-1">
              Design Your Dream Journey
            </h1>
            <p className="mt-2 text-lg text-[var(--text-secondary)] max-w-2xl">
              Your dates. Your tier. Hand-picked hotels that elevate as you go.
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
