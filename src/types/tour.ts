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
  islamabad: number;
  lahore: number | null;
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
  /** @deprecated Use pricing.islamabad instead */
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
}
