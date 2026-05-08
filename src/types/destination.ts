import type { IconName } from "@/components/ui/Icon";

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
  metaTitle: string;
  metaDescription: string;
}
