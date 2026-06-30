import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { HotelsClient } from "@/components/hotels/HotelsClient";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllHotels } from "@/services/hotel.service";
import { getAllDestinations } from "@/services/destination.service";

export const metadata: Metadata = buildMetadata({
  title: "Hotels in Pakistan — Handpicked Mountain Retreats, Resorts & Camps",
  description:
    "Book verified mountain hotels, lakeside resorts, and heritage guesthouses across Pakistan. Hunza, Skardu, Naltar, Chitral. Trusted by 1,300+ travelers.",
  path: "/hotels",
  tags: ["Pakistan hotels", "Hunza hotel", "Skardu hotel", "mountain resort Pakistan"],
});

export default async function HotelsPage() {
  const [hotels, allDestinations] = await Promise.all([getAllHotels(), getAllDestinations()]);
  const destinationOptions = allDestinations.map((d) => ({
    slug: d.slug,
    name: d.name,
    region: d.regionSlug,
    parentSlug: d.parentSlug ?? null,
  }));

  return (
    <div className="pb-12">
      <div className="py-4 sm:py-10 border-b border-[var(--border-default)]">
        <Container>
          <Breadcrumb items={[{ label: "Hotels" }]} />
          <div className="mt-2 sm:mt-4">
            <h1 className="text-[22px] sm:text-[42px] font-semibold sm:font-bold text-[var(--text-primary)] tracking-[-0.015em] sm:tracking-[-0.025em] leading-[1.15]">
              Popular Stays
            </h1>
            <p className="mt-1.5 text-[15px] sm:text-lg text-[var(--text-secondary)]">
              Handpicked hotels across Pakistan
            </p>
          </div>
        </Container>
      </div>

      <Suspense fallback={<div className="py-20 text-center text-[var(--text-tertiary)]">Loading…</div>}>
        <HotelsClient hotels={hotels} destinations={destinationOptions} />
      </Suspense>
    </div>
  );
}
