import type { IconName } from "@/components/ui/Icon";
import type { TourBlock } from "./tour-block";

export interface WhyVisitCard {
  icon: IconName;
  title: string;
  description: string;
}

export interface SeasonInfo {
  season: "spring" | "summer" | "autumn" | "winter";
  months: string;
  badge: string;
  badgeColor: "green" | "yellow" | "red" | "blue";
  description: string;
}

export interface Destination {
  id: string;
  slug: string;
  name: string;
  regionSlug: string;
  parentSlug?: string | null;
  ancestorSlugs?: string[];
  heroImage: string;
  subtitle: string;
  description: string;
  opening?: string;
  elevation?: string;
  tourCount: number;
  startingPrice: number;
  rating: number;
  whyVisitCards: WhyVisitCard[];
  seasons: SeasonInfo[];
  /** Long-form guide content — heading/paragraph/list/image/callout/embed/divider
   *  blocks. Rendered on the destination page between the hero and children rail.
   *  Optional so legacy static data (`src/data/destinations.ts`) doesn't have to
   *  fill it; DB rows default to []. */
  bodyBlocks?: TourBlock[];
  /** Order slot on the home DestinationsScroll carousel. NULL = not manually
   *  ranked; those destinations fall through to the starting-price fallback. */
  homeRank?: number | null;
  metaTitle: string;
  metaDescription: string;
  updatedAt?: string;
}
