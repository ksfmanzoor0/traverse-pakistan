import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { Hotel, HotelRoom, HotelSeasonDefinition, HotelReview, SeasonalPrice } from "@/types/hotel";

// ── Raw Supabase row shapes ───────────────────────────────────────────────────

type RawRoomPrice = {
  price: number;
  single_price: number | null;
  hotel_seasons: { label: string } | null;
};

type RawRoom = {
  id: string;
  name: string;
  beds: string;
  price: number;
  single_price: number | null;
  available: number;
  extra_occupancy_charge: number | null;
  capacity_adults: number;
  capacity_children: number;
  capacity_infants: number;
  max_occupancy: number | null;
  sort_order: number;
  is_active: boolean | null;
  hotel_room_prices: RawRoomPrice[];
};

type RawSeason = {
  label: string;
  sort_order: number;
  hotel_season_periods: { from_date: string; to_date: string }[];
};

type RawReview = {
  reviewer_name: string;
  initial: string;
  date: string;
  rating: number;
  body: string;
};

type RawHotel = {
  id: string;
  slug: string;
  name: string;
  destination_slug: string;
  location: string;
  tier: string;
  property_type: string;
  image: string;
  rating: number;
  review_count: number;
  price_per_night: number;
  margin: number;
  tax_rate: number;
  bed_tax_rate: number;
  guest_favourite: boolean;
  check_in: string;
  check_out: string;
  tax_note: string | null;
  description: string;
  amenities: string[];
  highlights: string[];
  policies: { rules: string[]; safety: string[]; cancellation: string[] };
  hotel_rooms: RawRoom[];
  hotel_seasons: RawSeason[];
  hotel_reviews: RawReview[];
};

const HOTEL_SELECT = `
  id, slug, name, destination_slug, location, tier, property_type, image,
  rating, review_count, price_per_night, margin, tax_rate, bed_tax_rate, guest_favourite, check_in, check_out,
  tax_note, description, amenities, highlights, policies,
  hotel_rooms (
    id, name, beds, price, single_price, available, extra_occupancy_charge,
    capacity_adults, capacity_children, capacity_infants, max_occupancy, sort_order,
    is_active,
    hotel_room_prices ( price, single_price, hotel_seasons ( label ) )
  ),
  hotel_seasons ( label, sort_order, hotel_season_periods ( from_date, to_date ) ),
  hotel_reviews ( reviewer_name, initial, date, rating, body )
`;

// ── Mapper ────────────────────────────────────────────────────────────────────

// Today's MM-DD against a season period (from/to are MM-DD after the slice below).
function periodCoversToday(from: string, to: string, mmdd: string): boolean {
  return from <= to ? mmdd >= from && mmdd <= to : mmdd >= from || mmdd <= to;
}

// Lowest room price for today's active season; falls back to global min(room.price)
// when no season period matches (e.g. closed/single-rate hotels).
function entryPriceForToday(rooms: HotelRoom[], seasons: HotelSeasonDefinition[]): number | null {
  if (rooms.length === 0) return null;
  const now = new Date();
  const mmdd = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const activeLabel = seasons.find((s) => s.periods.some((p) => periodCoversToday(p.from, p.to, mmdd)))?.label;
  if (activeLabel) {
    const seasonal = rooms
      .map((r) => r.prices?.find((p) => p.season === activeLabel)?.price)
      .filter((p): p is number => typeof p === "number");
    if (seasonal.length > 0) return Math.min(...seasonal);
  }
  return Math.min(...rooms.map((r) => r.price));
}

function toHotel(raw: RawHotel): Hotel {
  const rooms: HotelRoom[] = [...(raw.hotel_rooms ?? [])]
    .filter((r) => r.is_active !== false)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((r) => {
      const prices: SeasonalPrice[] = (r.hotel_room_prices ?? [])
        .filter((p) => p.hotel_seasons != null)
        .map((p) => ({
          season: p.hotel_seasons!.label,
          price: p.price,
          ...(p.single_price != null && { singlePrice: p.single_price }),
        }));

      return {
        name: r.name,
        beds: r.beds,
        price: r.price,
        ...(r.single_price != null && { singlePrice: r.single_price }),
        available: r.available,
        ...(r.extra_occupancy_charge != null && { extraOccupancyCharge: r.extra_occupancy_charge }),
        ...(prices.length > 0 && { prices }),
        capacity: {
          adults: r.capacity_adults,
          children: r.capacity_children,
          infants: r.capacity_infants,
          ...(r.max_occupancy != null && { maxOccupancy: r.max_occupancy }),
        },
      };
    });

  const seasons: HotelSeasonDefinition[] = [...(raw.hotel_seasons ?? [])]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({
      label: s.label,
      periods: (s.hotel_season_periods ?? []).map((p) => ({
        from: p.from_date.length === 10 ? p.from_date.slice(5) : p.from_date,
        to:   p.to_date.length   === 10 ? p.to_date.slice(5)   : p.to_date,
      })),
    }));

  const reviews: HotelReview[] = (raw.hotel_reviews ?? []).map((r) => ({
    name: r.reviewer_name,
    initial: r.initial,
    date: r.date,
    rating: Number(r.rating),
    text: r.body,
  }));

  return {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    destinationSlug: raw.destination_slug,
    location: raw.location,
    tier: raw.tier as Hotel["tier"],
    propertyType: raw.property_type,
    image: raw.image,
    images: [raw.image],
    rating: Number(raw.rating),
    reviewCount: raw.review_count,
    pricePerNight: entryPriceForToday(rooms, seasons) ?? raw.price_per_night,
    margin: Number(raw.margin),
    taxRate: Number(raw.tax_rate ?? 0),
    bedTaxRate: Number(raw.bed_tax_rate ?? 0),
    guestFavourite: raw.guest_favourite,
    checkIn: raw.check_in,
    checkOut: raw.check_out,
    ...(raw.tax_note && { taxNote: raw.tax_note }),
    description: raw.description,
    amenities: raw.amenities,
    highlights: raw.highlights,
    policies: raw.policies,
    rooms,
    ...(seasons.length > 0 && { seasons }),
    reviews,
  };
}

// ── Cached fetchers ───────────────────────────────────────────────────────────

const _fetchAllHotels = unstable_cache(
  async (): Promise<Hotel[]> => {
    // Service-role read: hotel catalog tables have RLS enabled with no anon
    // policies (deny-all), so cost columns (operator_price, margin) are not
    // readable via the public anon key. Reads here are server-only.
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("hotels")
      .select(HOTEL_SELECT)
      .order("name");
    if (error) throw new Error(`getAllHotels: ${error.message}`);
    return (data as unknown as RawHotel[]).map(toHotel);
  },
  ["all-hotels"],
  { tags: ["hotels"], revalidate: 86400 }
);

export const getAllHotels = cache(_fetchAllHotels);

export const getHotelBySlug = cache(async (slug: string): Promise<Hotel | null> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("hotels")
    .select(HOTEL_SELECT)
    .eq("slug", slug)
    .single();
  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getHotelBySlug: ${error.message}`);
  return toHotel(data as unknown as RawHotel);
});

export const getHotelsByDestination = cache(async (destinationSlug: string): Promise<Hotel[]> => {
  const all = await getAllHotels();
  return all.filter((h) => h.destinationSlug === destinationSlug);
});

export const getFeaturedHotels = cache(async (limit: number = 6): Promise<Hotel[]> => {
  const all = await getAllHotels();
  return all.filter((h) => h.guestFavourite).slice(0, limit);
});
