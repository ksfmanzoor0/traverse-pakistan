import type { TourImage, BadgeType, TourListItem } from "./tour";
import type { ItineraryStop, DepartureCity } from "./itinerary";
import type { TourBlock } from "./tour-block";

export type PackageTier = "deluxe" | "luxury";

export interface PackageTierPricing {
  ISB: number | null;
  LHE: number | null;
  KHI: number | null;
  /** Non-city extras — e.g. single-occupancy supplement. Preserved verbatim
   *  through normalization. */
  singleSupplement?: number | null;
}

export interface PackageDayHotels {
  deluxe: string; // hotel slug
  luxury: string; // hotel slug
}

export interface PackageItineraryDay {
  dayNumber: number;
  title: string;
  description: string;
  hotels: PackageDayHotels;
  stops: ItineraryStop[];
  drivingTime: string;
  overnight: string;
  cityOnly?: DepartureCity | DepartureCity[];
}

export interface PackageItinerary {
  packageSlug: string;
  days: PackageItineraryDay[];
}

export interface Package {
  id: string;
  slug: string;
  name: string;
  description: string;
  badge: BadgeType;
  duration: number;
  route: string;
  destinationSlug: string;
  relatedDestinationSlugs?: string[];
  destinationRank?: Record<string, number | { rank?: number; hidden?: boolean; featured?: boolean }>;
  regionSlug: string;
  rating: number;
  reviewCount: number;
  maxGroupSize: number;
  maxAdultsByTier: Record<string, number> | null;
  languages: string[];
  freeCancellation: boolean;
  reserveNowPayLater: boolean;
  images: TourImage[];
  highlights: string[];
  inclusions: TourListItem[];
  exclusions: TourListItem[];
  knowBeforeYouGo: string[];
  /** Rich block-editor content shown below the description on the package
   * page. Filtered client-side by traveler starting city. */
  bodyBlocks: TourBlock[];
  tiers: {
    deluxe: PackageTierPricing;
    luxury: PackageTierPricing;
  };
  metaTitle: string;
  metaDescription: string;
  /** Whether the package is flagged for the home Featured Packages carousel. */
  featured?: boolean;
  /** Explicit position in the home carousel — lower first, null = auto. */
  featuredRank?: number | null;
  updatedAt?: string;
}
