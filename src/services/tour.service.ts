import { cache } from "react";
import { unstable_cache } from "next/cache";
import { quoteTourAddons, type HomeCity } from "@/services/addon-cost.service";

const todayISO = () => new Date().toISOString().split("T")[0];
import { getSupabaseAnon } from "@/lib/supabase/server";
import { listR2Images, buildImagesFromR2 } from "@/lib/r2";
import type { TourRow, TourItineraryDayRow } from "@/lib/supabase/types";
import type { Tour, TourCategory, TourImage } from "@/types/tour";
import type { TourItinerary, ItineraryDay } from "@/types/itinerary";

function toTour(
  row: TourRow,
  priceMap?: Map<string, { base: number; earliestDate: string | null; singleSupplement: number | null }>,
  r2Images?: TourImage[],
  hasAddons?: boolean,
  addonCities?: string[],
  addonCostByCity?: Partial<Record<"ISB" | "LHE" | "KHI", number>>,
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
      base: prices?.base ?? 0,
      singleSupplement: prices?.singleSupplement ?? null,
    },
    price: prices?.base ?? 0,
    originalPrice: null,
    departureDate: prices?.earliestDate ?? row.departure_date ?? "",
    destinationSlug: row.destination_slug,
    regionSlug: row.region_slug,
    travelStyleSlugs: row.travel_style_slugs,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    maxGroupSize: row.max_group_size,
    minAge: row.min_age ?? null,
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
    updatedAt: row.updated_at ?? undefined,
    hasAddons,
    anchorCity: row.anchor_city,
    addonCities,
    addonCostByCity: addonCostByCity as Tour["addonCostByCity"],
  };
}

// Derive addon coverage per slug. Returns a map slug →
// { hasAddons, cities, costByCity }. costByCity covers every home city an
// addon touches — bus/manual legs are summed directly from farePerPerson,
// scraper-driven flight legs are resolved via quoteTourAddons against the
// tour's earliest upcoming departure date. Result flows into the Tour type
// and lets JSON-LD emit an AggregateOffer with real per-city totals.
interface AddonCoverage {
  hasAddons: boolean;
  cities: string[];
  costByCity: Partial<Record<"ISB" | "LHE" | "KHI", number>>;
}

async function fetchAddonCoverage(
  supabase: ReturnType<typeof getSupabaseAnon>,
  slugs: string[],
  earliestDatesBySlug: Map<string, string | null>,
): Promise<Map<string, AddonCoverage>> {
  const map = new Map<string, AddonCoverage>();
  if (slugs.length === 0) return map;

  const { data } = await supabase
    .from("tour_addons")
    .select("tour_slug, applies_to_departures")
    .in("tour_slug", slugs);
  const citiesBySlug = new Map<string, Set<string>>();
  for (const r of (data ?? []) as { tour_slug: string; applies_to_departures: string[] }[]) {
    const set = citiesBySlug.get(r.tour_slug) ?? new Set<string>();
    for (const c of r.applies_to_departures ?? []) set.add(c);
    citiesBySlug.set(r.tour_slug, set);
  }

  // For each (slug, city) combo, quote once so scraper legs resolve too.
  // Parallelised: at 23 tours × up to 3 cities this is ~70 SQL reads,
  // cached by unstable_cache for an hour per _fetchAllTours call.
  const jobs: Array<Promise<void>> = [];
  for (const slug of slugs) {
    const cities = citiesBySlug.get(slug);
    if (!cities || cities.size === 0) continue;
    const startDate = earliestDatesBySlug.get(slug);
    if (!startDate) continue;
    const entry: AddonCoverage = {
      hasAddons: true,
      cities: Array.from(cities),
      costByCity: {},
    };
    map.set(slug, entry);
    for (const cityCode of cities) {
      const c = cityCode as HomeCity;
      jobs.push(
        quoteTourAddons({ tourSlug: slug, homeCity: c, startDate })
          .then((q) => { if (q) entry.costByCity[c] = q.addonCostPerPerson; })
          .catch((e) => { console.error(`[fetchAddonCoverage] ${slug}/${c}:`, e); }),
      );
    }
  }
  await Promise.all(jobs);
  return map;
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
        stops: r.stops as ItineraryDay["stops"],
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
  // Every tour has NULL-city departure rows (addon-driven model). The base
  // price is city-agnostic; per-home-city delta is layered on at checkout
  // via quoteTourAddons. We keep the earliest single-supplement seen across
  // all departure rows so the sidebar can offer private-room pricing.
  const map = new Map<string, { base: number; earliestDate: string | null; singleSupplement: number | null }>();
  for (const row of (data ?? []) as { tour_slug: string; price: number; departure_date: string; single_supplement: number | null }[]) {
    const entry = map.get(row.tour_slug) ?? { base: 0, earliestDate: null, singleSupplement: null };
    if (entry.base === 0) entry.base = row.price;
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
    const earliestBySlug = new Map<string, string | null>();
    for (const r of rows) earliestBySlug.set(r.slug, priceMap.get(r.slug)?.earliestDate ?? r.departure_date);
    const coverage = await fetchAddonCoverage(supabase, rows.map((r) => r.slug), earliestBySlug);
    return rows.map((r) => {
      const c = coverage.get(r.slug);
      return toTour(r, priceMap, undefined, !!c, c?.cities, c?.costByCity);
    });
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
  const earliestBySlug = new Map<string, string | null>([
    [slug, priceMap.get(slug)?.earliestDate ?? row.departure_date],
  ]);
  const coverage = await fetchAddonCoverage(supabase, [slug], earliestBySlug);
  const r2Images = r2Urls.length ? buildImagesFromR2(r2Urls, row.name) : undefined;
  const c = coverage.get(row.slug);
  return toTour(row, priceMap, r2Images, !!c, c?.cities, c?.costByCity);
});

export const getToursByDestination = cache(async (destinationSlug: string): Promise<Tour[]> => {
  const supabase = getSupabaseAnon();
  const activeSlugs = await getActiveTourSlugs(supabase);
  if (activeSlugs.length === 0) return [];
  // Include tours anchored to any ancestor destination so child pages
  // (e.g. buni, shandur) surface their parent's (chitral) tours.
  const { data: ancestorSlugsData } = await supabase.rpc("destination_slug_with_ancestors" as never, { p_slug: destinationSlug } as never);
  const slugs = ((ancestorSlugsData as string[] | null) ?? [destinationSlug]).filter(Boolean);
  const slugList = slugs.join(",");
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .or(`destination_slug.in.(${slugList}),related_destination_slugs.ov.{${slugList}}`)
    .in("slug", activeSlugs);
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
