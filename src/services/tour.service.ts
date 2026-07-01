import { cache } from "react";
import { unstable_cache } from "next/cache";

const todayISO = () => new Date().toISOString().split("T")[0];
import { getSupabaseAnon } from "@/lib/supabase/server";
import { listR2Images, buildImagesFromR2 } from "@/lib/r2";
import type { TourRow, TourItineraryDayRow } from "@/lib/supabase/types";
import type { Tour, TourCategory, TourImage } from "@/types/tour";
import type { TourItinerary } from "@/types/itinerary";

function toTour(
  row: TourRow,
  priceMap?: Map<string, { islamabad: number; lahore: number | null; earliestDate: string | null; singleSupplement: number | null }>,
  r2Images?: TourImage[]
): Tour {
  const prices = priceMap?.get(row.slug);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category as TourCategory,
    badge: row.badge as Tour["badge"],
    duration: row.duration,
    route: row.route,
    pricing: {
      islamabad: prices?.islamabad ?? 0,
      lahore: prices?.lahore ?? null,
      singleSupplement: prices?.singleSupplement ?? null,
    },
    price: prices?.islamabad ?? 0,
    originalPrice: null,
    departureDate: prices?.earliestDate ?? row.departure_date ?? "",
    destinationSlug: row.destination_slug,
    regionSlug: row.region_slug,
    travelStyleSlugs: row.travel_style_slugs,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    maxGroupSize: row.max_group_size,
    languages: row.languages,
    freeCancellation: row.free_cancellation,
    reserveNowPayLater: row.reserve_now_pay_later,
    images: r2Images ?? ((row.images as unknown as (TourImage | string)[] | null) ?? []).map((img) =>
      typeof img === "string" ? { url: img, alt: row.name } : img
    ),
    guide: row.guide ?? undefined,
    highlights: row.highlights,
    inclusions: row.inclusions,
    exclusions: row.exclusions,
    knowBeforeYouGo: row.know_before_you_go,
    meetingPoint: row.meeting_point,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
  };
}

function toItinerary(tourSlug: string, rows: TourItineraryDayRow[]): TourItinerary {
  return {
    tourSlug,
    days: rows
      .sort((a, b) => a.day_number - b.day_number)
      .map((r) => ({
        dayNumber: r.day_number,
        title: r.title,
        description: r.description,
        image: r.image
          ? typeof r.image === "string"
            ? { url: r.image, alt: r.title }
            : (r.image as { url: string; alt: string })
          : null,
        stops: r.stops,
        drivingTime: r.driving_time,
        overnight: r.overnight,
      })),
  };
}

async function buildPriceMap(supabase: ReturnType<typeof getSupabaseAnon>, slugs?: string[]) {
  let query = supabase
    .from("departures")
    .select("tour_slug, departure_city, price, departure_date, single_supplement")
    .eq("status", "open")
    .gte("departure_date", todayISO());
  if (slugs?.length) query = query.in("tour_slug", slugs);
  const { data } = await query;
  const map = new Map<string, { islamabad: number; lahore: number | null; earliestDate: string | null; singleSupplement: number | null }>();
  for (const row of (data ?? []) as { tour_slug: string; departure_city: string; price: number; departure_date: string; single_supplement: number | null }[]) {
    const entry = map.get(row.tour_slug) ?? { islamabad: 0, lahore: null, earliestDate: null, singleSupplement: null };
    if (row.departure_city === "islamabad") entry.islamabad = row.price;
    else if (row.departure_city === "lahore") entry.lahore = row.price;
    if (!entry.earliestDate || row.departure_date < entry.earliestDate) {
      entry.earliestDate = row.departure_date;
    }
    if (row.single_supplement && (!entry.singleSupplement || row.single_supplement < entry.singleSupplement)) {
      entry.singleSupplement = row.single_supplement;
    }
    map.set(row.tour_slug, entry);
  }
  return map;
}

// Tour slugs with at least one open future departure. Source of truth for
// "is this tour listable" — tours.departure_date is denormalized and can
// go stale when departures roll over, so we never trust it for visibility.
async function getActiveTourSlugs(supabase: ReturnType<typeof getSupabaseAnon>): Promise<string[]> {
  const { data } = await supabase
    .from("departures")
    .select("tour_slug")
    .eq("status", "open")
    .gte("departure_date", todayISO());
  const set = new Set<string>();
  for (const row of (data ?? []) as { tour_slug: string }[]) set.add(row.tour_slug);
  return [...set];
}

const _fetchAllTours = unstable_cache(
  async (): Promise<Tour[]> => {
    const supabase = getSupabaseAnon();
    const activeSlugs = await getActiveTourSlugs(supabase);
    if (activeSlugs.length === 0) return [];
    const { data, error } = await supabase.from("tours").select("*").in("slug", activeSlugs).order("departure_date", { nullsFirst: false });
    if (error) throw new Error(`getAllTours: ${error.message}`);
    const rows = data as TourRow[];
    const priceMap = await buildPriceMap(supabase, rows.map((r) => r.slug));
    return rows.map((r) => toTour(r, priceMap));
  },
  ["all-tours"],
  { tags: ["tours"], revalidate: 3600 }
);

export const getAllTours = cache(_fetchAllTours);

export const getTourBySlug = cache(async (slug: string): Promise<Tour | null> => {
  const supabase = getSupabaseAnon();
  const [{ data, error }, r2Urls, priceMap] = await Promise.all([
    supabase.from("tours").select("*").eq("slug", slug).single(),
    listR2Images(`tours/${slug}/`),
    buildPriceMap(supabase, [slug]),
  ]);
  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getTourBySlug: ${error.message}`);
  const row = data as TourRow;
  const r2Images = r2Urls.length ? buildImagesFromR2(r2Urls, row.name) : undefined;
  return toTour(row, priceMap, r2Images);
});

export const getToursByDestination = cache(async (destinationSlug: string): Promise<Tour[]> => {
  const supabase = getSupabaseAnon();
  const activeSlugs = await getActiveTourSlugs(supabase);
  if (activeSlugs.length === 0) return [];
  const { data, error } = await supabase.from("tours").select("*").eq("destination_slug", destinationSlug).in("slug", activeSlugs);
  if (error) throw new Error(`getToursByDestination: ${error.message}`);
  const rows = data as TourRow[];
  const priceMap = await buildPriceMap(supabase, rows.map((r) => r.slug));
  return rows.map((r) => toTour(r, priceMap));
});

export const getToursByRegion = cache(async (regionSlug: string): Promise<Tour[]> => {
  const supabase = getSupabaseAnon();
  const activeSlugs = await getActiveTourSlugs(supabase);
  if (activeSlugs.length === 0) return [];
  const { data, error } = await supabase.from("tours").select("*").eq("region_slug", regionSlug).in("slug", activeSlugs);
  if (error) throw new Error(`getToursByRegion: ${error.message}`);
  const rows = data as TourRow[];
  const priceMap = await buildPriceMap(supabase, rows.map((r) => r.slug));
  return rows.map((r) => toTour(r, priceMap));
});

export const getToursByCategory = cache(async (category: TourCategory): Promise<Tour[]> => {
  const supabase = getSupabaseAnon();
  const activeSlugs = await getActiveTourSlugs(supabase);
  if (activeSlugs.length === 0) return [];
  const { data, error } = await supabase.from("tours").select("*").eq("category", category).in("slug", activeSlugs);
  if (error) throw new Error(`getToursByCategory: ${error.message}`);
  const rows = data as TourRow[];
  const priceMap = await buildPriceMap(supabase, rows.map((r) => r.slug));
  return rows.map((r) => toTour(r, priceMap));
});

export const getToursByStyle = cache(async (styleSlug: string): Promise<Tour[]> => {
  const supabase = getSupabaseAnon();
  const activeSlugs = await getActiveTourSlugs(supabase);
  if (activeSlugs.length === 0) return [];
  const { data, error } = await supabase.from("tours").select("*").contains("travel_style_slugs", [styleSlug]).in("slug", activeSlugs).order("created_at", { ascending: false });
  if (error) throw new Error(`getToursByStyle: ${error.message}`);
  const rows = data as TourRow[];
  const priceMap = await buildPriceMap(supabase, rows.map((r) => r.slug));
  return rows.map((r) => toTour(r, priceMap));
});

export const getFeaturedTours = cache(async (limit?: number): Promise<Tour[]> => {
  const supabase = getSupabaseAnon();
  const activeSlugs = await getActiveTourSlugs(supabase);
  if (activeSlugs.length === 0) return [];
  let query = supabase.from("tours").select("*").not("badge", "is", null).in("slug", activeSlugs).order("review_count", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error(`getFeaturedTours: ${error.message}`);
  const rows = data as TourRow[];
  const priceMap = await buildPriceMap(supabase, rows.map((r) => r.slug));
  return rows.map((r) => toTour(r, priceMap));
});

export const getSimilarTours = cache(async (tourSlug: string, limit = 4): Promise<Tour[]> => {
  const supabase = getSupabaseAnon();
  const { data: tour } = await supabase
    .from("tours")
    .select("destination_slug")
    .eq("slug", tourSlug)
    .single();
  if (!tour) return [];
  const activeSlugs = await getActiveTourSlugs(supabase);
  if (activeSlugs.length === 0) return [];
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("destination_slug", tour.destination_slug)
    .neq("slug", tourSlug)
    .in("slug", activeSlugs)
    .limit(limit);
  if (error) throw new Error(`getSimilarTours: ${error.message}`);
  const rows = data as TourRow[];
  const priceMap = await buildPriceMap(supabase, rows.map((r) => r.slug));
  return rows.map((r) => toTour(r, priceMap));
});

export const getItineraryByTourSlug = cache(
  async (tourSlug: string): Promise<TourItinerary | null> => {
    const supabase = getSupabaseAnon();
    const { data, error } = await supabase
      .from("tour_itinerary_days")
      .select("*")
      .eq("tour_slug", tourSlug)
      .order("day_number");
    if (error) throw new Error(`getItineraryByTourSlug: ${error.message}`);
    if (!data || data.length === 0) return null;
    return toItinerary(tourSlug, data as TourItineraryDayRow[]);
  }
);

export const searchTours = cache(async (query: string): Promise<Tour[]> => {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,destination_slug.ilike.%${query}%,route.ilike.%${query}%`);
  if (error) throw new Error(`searchTours: ${error.message}`);
  const rows = data as TourRow[];
  const priceMap = await buildPriceMap(supabase, rows.map((r) => r.slug));
  return rows.map((r) => toTour(r, priceMap));
});
