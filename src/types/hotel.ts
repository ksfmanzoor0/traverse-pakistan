export type HotelTier = "standard" | "deluxe" | "premium" | "luxury";

export interface SeasonalPrice {
  season: string;   // matches HotelSeasonDefinition.label
  price: number;    // display price (base + 20% margin)
}

export interface HotelSeasonPeriod {
  from: string;     // "MM-DD"
  to: string;       // "MM-DD"
}

export interface HotelSeasonDefinition {
  label: string;
  periods: HotelSeasonPeriod[];  // array handles non-contiguous ranges (e.g. Off Season split by Blossom)
}

export interface RoomCapacity {
  adults: number;          // max adults per room
  children: number;        // max children per room (age CHILD_MIN_AGE – CHILD_MAX_AGE)
  infants: number;         // max infants per room (age 0 – INFANT_MAX_AGE, in crib — not counted toward maxOccupancy)
  maxOccupancy?: number;   // total adults+children cap per room; defaults to adults+children if omitted
}

export interface HotelRoom {
  name: string;
  beds: string;
  price: number;                    // lowest display price — used on listing cards & legacy hotels
  prices?: SeasonalPrice[];         // seasonal base prices; applyHotelMargin applied at display time
  capacity?: RoomCapacity;          // per-room occupancy limits; falls back to sidebar defaults if absent
  extraOccupancyCharge?: number;    // per extra person per night beyond standard occupancy (2 guests)
  available: number;
  image?: string;                   // static fallback image; omitted for DB-sourced hotels (R2 is source of truth)
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
  pricePerNight: number;        // entry price (lowest room, lowest season) for listing cards
  margin: number;               // per-hotel markup applied to corporate/base rates → display price
  seasons?: HotelSeasonDefinition[];
  taxNote?: string;             // e.g. "No GST — Gilgit-Baltistan tax-free zone"
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
