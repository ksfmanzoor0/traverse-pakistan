export type HotelTier = "standard" | "deluxe" | "premium" | "luxury";

export interface HotelRoom {
  name: string;
  beds: string;
  price: number;
  available: number;
  image: string;
}

export interface HotelReview {
  name: string;
  initial: string;
  date: string;
  rating: number;
  text: string;
}

export interface Hotel {
  id: string;
  slug: string;
  name: string;
  destinationSlug: string;
  location: string;
  tier: HotelTier;
  propertyType: string;
  image: string;
  images: string[];
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  margin: number;           // per-hotel markup applied to corporate/base rates → display price
  taxNote?: string;
  amenities: string[];
  description: string;
  highlights: string[];
  rooms: HotelRoom[];
  reviews: HotelReview[];
  checkIn: string;
  checkOut: string;
  policies: {
    rules: string[];
    safety: string[];
    cancellation: string[];
  };
}
