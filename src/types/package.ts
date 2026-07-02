import type { TourImage, BadgeType } from "./tour";
import type { ItineraryStop, DepartureCity } from "./itinerary";

export type PackageTier = "deluxe" | "luxury";

export interface PackageTierPricing {
  islamabad: number | null;
  lahore: number | null;
  karachi: number | null;
  singleSupplement: number | null;
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
  destinationRank?: Record<string, number>;
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
  inclusions: string[];
  exclusions: string[];
  knowBeforeYouGo: string[];
  tiers: {
    deluxe: PackageTierPricing;
    luxury: PackageTierPricing;
  };
  metaTitle: string;
  metaDescription: string;
  updatedAt?: string;
}
