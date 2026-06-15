import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { CustomiseTourForm } from "@/components/quote/CustomiseTourForm";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllDestinations } from "@/services/destination.service";

export const metadata: Metadata = buildMetadata({
  title: "Plan My Trip — Build a Custom Pakistan Tour",
  description:
    "Tell us your destination, dates, group size and interests and our travel team will craft a tailored Pakistan itinerary with pricing — usually within 2 hours.",
  path: "/customise-tour",
  tags: ["custom Pakistan tour", "tailor-made tour", "plan trip Pakistan", "bespoke itinerary"],
});

export default async function CustomiseTourPage() {
  const allDestinations = await getAllDestinations();
  const destinationOptions = allDestinations.map((d) => ({
    slug: d.slug,
    name: d.name,
    region: d.regionSlug,
    parentSlug: d.parentSlug ?? null,
  }));

  return (
    <div className="pb-16">
      <div className="py-4 sm:py-10 border-b border-[var(--border-default)]">
        <Container>
          <Breadcrumb items={[{ label: "Plan My Trip" }]} />
          <div className="mt-2 sm:mt-4 max-w-[680px]">
            <h1 className="text-[26px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-[-0.025em] leading-[1.15]">
              Plan your perfect trip
            </h1>
            <p className="mt-1.5 text-[15px] sm:text-lg text-[var(--text-secondary)]">
              Pick a destination, dates and group size — add what you love — and our local experts
              will design a custom itinerary with pricing, usually within 2 hours.
            </p>
          </div>
        </Container>
      </div>

      <Container>
        <div className="max-w-[820px] mx-auto pt-8 sm:pt-12">
          <CustomiseTourForm destinations={destinationOptions} />
        </div>
      </Container>
    </div>
  );
}
