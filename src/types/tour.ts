export type TourCategory =
  | "group-tour"
  | "trekking"
  | "cultural"
  | "luxury"
  | "adventure"
  | "camping"
  | "wildlife"
  | "skiing"
  | "coastal";

export type BadgeType = "on-sale" | "epic-trek" | "bestseller" | "new" | null;

export interface TourImage {
  url: string;
  alt: string;
}

export interface TourPricing {
  // Ground-only price per person (city-agnostic). Per-city variance is layered
  // on at runtime via tour_addons — see quoteTourAddons in addon-cost.service.
  base: number;
  singleSupplement: number | null;
  international?: number | null;
}

export interface MeetingPoint {
  address: string;
  departureTime: string;
  arrivalInstruction: string;
  endPoint: string;
  mapEmbedUrl: string;
  pickupOffered: boolean;
  pickupDescription: string;
}

export interface Tour {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: TourCategory;
  badge: BadgeType;
  duration: number;
  route: string;
  pricing: TourPricing;
  /** @deprecated Use pricing.base instead */
  price: number;
  /** @deprecated Use pricing difference for sale calc */
  originalPrice: number | null;
  departureDate: string;
  destinationSlug: string;
  regionSlug: string;
  travelStyleSlugs: string[];
  rating: number;
  reviewCount: number;
  maxGroupSize: number;
  /** Minimum participant age; null = no restriction. If >= 13, children are disallowed. */
  minAge: number | null;
  languages: string[];
  freeCancellation: boolean;
  reserveNowPayLater: boolean;
  images: TourImage[];
  guide?: {
    name: string;
    yearsGuiding: number;
    photo?: string;
  };
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  knowBeforeYouGo: string[];
  meetingPoint: MeetingPoint;
  metaTitle: string;
  metaDescription: string;
  updatedAt?: string;
  /** True when the tour has tour_addons rows (flight/bus pickers at checkout).
   * Card price shows base + "+ transport" chip instead of the bare number. */
  hasAddons?: boolean;
  /** City that pays the ground base with no addon (e.g. "ISB" for most tours,
   * "KHI" for Gwadar). null when every home city requires a transport addon. */
  anchorCity?: "ISB" | "LHE" | "KHI" | "KDU" | null;
  /** Home-city codes ({"ISB","LHE","KHI"}) that at least one addon covers.
   * Derived from tour_addons.applies_to_departures. */
  addonCities?: string[];
  /** Statically-computable per-home-city transport add-on totals (PKR).
   * Only populated when EVERY relevant addon leg carries a farePerPerson
   * (bus and locked-fare flight cases). Scraper-driven flight addons don't
   * populate this — their price changes daily and would go stale in caches
   * or JSON-LD. Consumers: SEO schema AggregateOffer + rich price signals. */
  addonCostByCity?: Record<"ISB" | "LHE" | "KHI" | "KDU", number>;
}
