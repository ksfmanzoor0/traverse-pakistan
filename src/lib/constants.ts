export const SITE_CONFIG = {
  name: "Traverse Pakistan",
  tagline: "Pakistan's Highest-Rated Tourism Company",
  description:
    "Explore Pakistan with the highest-rated tour operator. Book group tours, custom trips, hotels, and transport across Hunza, Skardu, Chitral, and beyond.",
  url: "https://traversepakistan.com",
  phone: "+92-321-6650670",
  email: "info@traversepakistan.com",
  whatsapp: "923216650670",
  address:
    "Office #6, Plot No. 1, near Grand Islamabad Hotel, MPCHS E-11/1, Islamabad",
  social: {
    instagram: "https://instagram.com/traversepakistan",
    facebook: "https://facebook.com/traversepakistan",
  },
  stats: {
    rating: 4.9,
    reviewCount: 1300,
    tourCount: 22,
    regionCount: 15,
    recommendRate: 98,
  },
} as const;

export const IMAGE_BASE =
  "https://traversepakistan.com/wp-content/uploads";

/** Margin applied on top of base hotel room rates before displaying to customers. */
export const HOTEL_MARGIN = 0.20;

/** Returns the customer-facing display price from a base room rate. */
export function applyHotelMargin(basePrice: number): number {
  return Math.round(basePrice * (1 + HOTEL_MARGIN));
}

/** Guest age boundaries — adjust here to apply globally across all hotel booking UIs. */
export const INFANT_MAX_AGE = 1;   // 0 – 1 year
export const CHILD_MIN_AGE  = 2;   // 2 years
export const CHILD_MAX_AGE  = 12;  // 2 – 12 years

/** Fallback capacity used for rooms that don't define their own RoomCapacity. */
import type { RoomCapacity } from "@/types/hotel";
export const DEFAULT_ROOM_CAPACITY: RoomCapacity = { adults: 3, children: 2, infants: 1 };
