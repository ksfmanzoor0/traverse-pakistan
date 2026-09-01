"use client";

import { useSharedDepartureCity } from "@/hooks/useSharedDepartureCity";
import { BlockRenderer } from "@/components/ui/BlockList";
import type { TourBlock } from "@/types/tour-block";

const CITY_TO_HOME: Record<"islamabad" | "lahore" | "karachi" | "skardu", "ISB" | "LHE" | "KHI" | "KDU"> = {
  islamabad: "ISB", lahore: "LHE", karachi: "KHI", skardu: "KDU",
};

interface Props {
  blocks: TourBlock[];
  tourSlug: string;
  initialDeparture?: "islamabad" | "lahore" | "karachi" | "skardu";
}

// Renders the tour body block-list. Blocks with cityOnly hide themselves
// unless the traveler's home city is in the list — same bus as the
// itinerary + inclusions filters. Shared BlockRenderer handles the
// per-block markup (used server-side by destination pages too).
export function TourBody({ blocks, tourSlug, initialDeparture = "islamabad" }: Props) {
  const [departure] = useSharedDepartureCity(initialDeparture, tourSlug);
  const home = CITY_TO_HOME[departure];
  const visible = blocks.filter((b) => !b.cityOnly || b.cityOnly.length === 0 || b.cityOnly.includes(home));
  if (visible.length === 0) return null;
  return (
    <div className="space-y-6">
      {visible.map((block) => <BlockRenderer key={block.id} block={block} />)}
    </div>
  );
}
