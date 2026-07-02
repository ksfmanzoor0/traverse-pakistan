export type HotelTier = "standard" | "deluxe" | "premium" | "luxury";

export interface SeasonalPrice {
  season: string;       // matches HotelSeasonDefinition.label
  price: number;        // display price (base + 20% margin)
  singlePrice?: number; // seasonal single-occupancy display rate; overrides HotelRoom.singlePrice for this season. Falls back to HotelRoom.singlePrice, then price.
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
  singlePrice?: number;             // flat single-occupancy display rate (pre-tax). Used when 1 adult/0 children per room; falls back to price. The matching single_operator_price stays DB-only (reconciliation — never sent to client).
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
  taxRate?: number;             // GST rate as decimal (e.g. 0.16). Applied at sidebar/checkout, never baked into room.price. Absent → 0.
  bedTaxRate?: number;          // Bed/occupancy tax rate as decimal (e.g. 0.07). Applied independently of GST. Absent → 0.
  guestFavourite?: boolean;
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
  updatedAt?: string;
}
