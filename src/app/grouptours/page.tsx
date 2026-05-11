import type { Metadata } from "next";
import { Suspense } from "react";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { GroupToursClient } from "@/components/tours/GroupToursClient";
import { buildMetadata } from "@/lib/seo/metadata";
import { getAllTours } from "@/services/tour.service";

export const metadata: Metadata = buildMetadata({
  title: "Pakistan Group Tours — 22 Fixed-Departure Trips from Islamabad & Lahore",
  description:
    "Browse 22 group tours across Pakistan: Hunza, Skardu, K2 Base Camp, Chitral, Kalash, Deosai. Dual-city departures, expert guides, 4.9★ from 1,300+ travelers.",
  path: "/grouptours",
  tags: ["Pakistan group tours", "Hunza tour", "Skardu tour", "Karakoram tours"],
});

export default async function GroupToursPage() {
  const tours = await getAllTours();

  return (
    <div className="pb-12">
      <div className="py-4 sm:py-10 border-b border-[var(--border-default)]">
        <Container>
          <Breadcrumb items={[{ label: "Group Tours" }]} />
          <div className="mt-2 sm:mt-4">
            <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight">
              Explore All Group Tours
            </h1>
            <p className="text-lg text-[var(--text-secondary)] mt-1 sm:mt-2">
              Fixed-departure trips across Pakistan — expert guides, dual-city departures
            </p>
          </div>
        </Container>
      </div>

      <Suspense fallback={<div className="py-20 text-center text-[var(--text-tertiary)]">Loading…</div>}>
        <GroupToursClient tours={tours} />
      </Suspense>
    </div>
  );
}
