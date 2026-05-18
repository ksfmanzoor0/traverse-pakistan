import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseAnon } from "@/lib/supabase/server";
import { listR2Images, buildImagesFromR2 } from "@/lib/r2";
import type { PackageRow, PackageItineraryDayRow } from "@/lib/supabase/types";
import type { Package } from "@/types/package";
import type { PackageItinerary, PackageItineraryDay } from "@/types/package";

function shuffleGallery(slug: string, images: Package["images"]): Package["images"] {
  if (images.length <= 1) return images;
  const coverIdx = images.findIndex(img => /\/cover\./i.test(img.url));
  const result = coverIdx >= 0
    ? [images[coverIdx], ...images.filter((_, i) => i !== coverIdx)]
    : [...images];
  let seed = 0;
  for (let i = 0; i < slug.length; i++) seed = (seed * 31 + slug.charCodeAt(i)) & 0x7fffffff;
  for (let i = result.length - 1; i > 1; i--) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    const j = 1 + (seed % i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function toPackage(row: PackageRow): Package {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    badge: (row.badge ?? "new") as Package["badge"],
    duration: row.duration,
    route: row.route ?? "",
    destinationSlug: row.destination_slug,
    relatedDestinationSlugs: row.related_destination_slugs ?? [],
    regionSlug: row.region_slug,
    rating: Number(row.rating),
    reviewCount: row.review_count,
    maxGroupSize: row.max_group_size ?? 12,
    languages: row.languages ?? [],
    freeCancellation: row.free_cancellation,
    reserveNowPayLater: row.reserve_now_pay_later,
    images: shuffleGallery(row.slug, ((row.images as unknown as string[] | null) ?? []).map((url) => ({ url, alt: row.name }))),
    highlights: row.highlights ?? [],
    inclusions: row.inclusions ?? [],
    exclusions: row.exclusions ?? [],
    knowBeforeYouGo: row.know_before_you_go ?? [],
    tiers: row.pricing as Package["tiers"],
    metaTitle: row.meta_title ?? row.name,
    metaDescription: row.meta_description ?? "",
  };
}

function toItineraryDay(row: PackageItineraryDayRow): PackageItineraryDay {
  return {
    dayNumber: row.day_number,
    title: row.title,
    description: row.description ?? "",
    hotels: {
      deluxe: row.hotel_deluxe ?? "",
      luxury: row.hotel_luxury ?? "",
    },
    stops: (row.stops as PackageItineraryDay["stops"] | null) ?? [],
    drivingTime: row.driving_time ?? "",
    overnight: row.overnight ?? "",
    cityOnly: row.city_only?.length
      ? (row.city_only as PackageItineraryDay["cityOnly"])
      : undefined,
  };
}

// ── cached fetchers ───────────────────────────────────────────────────────────

const _fetchAllPackages = unstable_cache(
  async (): Promise<Package[]> => {
    const supabase = getSupabaseAnon();
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .order("name");

    if (error) throw new Error(`getAllPackages: ${error.message}`);
    return (data as unknown as PackageRow[]).map(toPackage);
  },
  ["all-packages"],
  { tags: ["packages"], revalidate: 86400 }
);

export const getAllPackages = cache(_fetchAllPackages);

export const getPackageBySlug = cache(async (slug: string): Promise<Package | null> => {
  const supabase = getSupabaseAnon();
  const [{ data, error }, r2Urls] = await Promise.all([
    supabase.from("packages").select("*").eq("slug", slug).single(),
    listR2Images(`packages/${slug}/`),
  ]);

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getPackageBySlug: ${error.message}`);
  const pkg = toPackage(data as unknown as PackageRow);
  if (r2Urls.length) {
    pkg.images = shuffleGallery(slug, buildImagesFromR2(r2Urls, pkg.name));
  }
  return pkg;
});

export const getPackageItinerary = cache(async (slug: string): Promise<PackageItinerary | null> => {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("package_itinerary_days")
    .select("*")
    .eq("package_slug", slug)
    .order("day_number");

  if (error) throw new Error(`getPackageItinerary: ${error.message}`);
  if (!data || data.length === 0) return null;

  return {
    packageSlug: slug,
    days: (data as unknown as PackageItineraryDayRow[]).map(toItineraryDay),
  };
});

const FEATURED_PACKAGE_SLUGS = [
  "northern-pakistan-grand-tour",
  "hunza-valley-escape",
  "pakistan-historical-12day",
  "skardu-heaven-on-earth",
  "chitral-kailash-gol-4day",
  "old-lahore-day-tour",
  "historical-sindh-3day",
  "sharan-forest-3day",
  "galiyat-nathiagali-3day",
  "gwadar-makran-3day",
  "swat-kalam-malam-jabba-4day",
];

export const getFeaturedPackages = cache(async (): Promise<Package[]> => {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .in("slug", FEATURED_PACKAGE_SLUGS);

  if (error) throw new Error(`getFeaturedPackages: ${error.message}`);
  const rows = (data as unknown as PackageRow[]).map(toPackage);
  // Return in the defined display order
  return FEATURED_PACKAGE_SLUGS.flatMap((slug) => rows.filter((p) => p.slug === slug));
});

export const getPackagesByDestination = cache(
  async (destinationSlug: string): Promise<Package[]> => {
    const supabase = getSupabaseAnon();
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .or(`destination_slug.eq.${destinationSlug},related_destination_slugs.cs.{${destinationSlug}}`);

    if (error) throw new Error(`getPackagesByDestination: ${error.message}`);
    return (data as unknown as PackageRow[]).map(toPackage);
  }
);

export const getPackagesByStyle = cache(
  async (styleSlug: string): Promise<Package[]> => {
    const supabase = getSupabaseAnon();
    const { data, error } = await supabase
      .from("packages")
      .select("*")
      .contains("travel_style_slugs", [styleSlug]);
    if (error) throw new Error(`getPackagesByStyle: ${error.message}`);
    return (data as unknown as PackageRow[]).map(toPackage);
  }
);
