import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseAnon } from "@/lib/supabase/server";
import type { DestinationRow, RegionRow } from "@/lib/supabase/types";
import type { Destination } from "@/types/destination";
import type { DestinationOption } from "@/components/home/SearchWidget";
import type { FAQ } from "@/types/faq";
import { destinations as localDestinations } from "@/data/destinations";

const REGION_NAMES: Record<string, string> = {
  "gilgit-baltistan": "Gilgit Baltistan",
  "kpk": "KPK",
  "azad-kashmir": "Azad Kashmir",
  "balochistan": "Balochistan",
  "sindh": "Sindh",
  "punjab": "Punjab",
};

type DestinationWithRegion = DestinationRow & {
  regions: Pick<RegionRow, "slug" | "name"> | null;
};

function toDestination(row: DestinationWithRegion): Destination {
  const local = localDestinations.find((d) => d.slug === row.slug);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle ?? "",
    description: row.description ?? "",
    opening: local?.opening,
    regionSlug: row.regions?.slug ?? "",
    parentSlug: row.parent_id ?? null,
    ancestorSlugs: [],
    heroImage: row.hero_image ?? "",
    elevation: row.elevation ?? undefined,
    tourCount: 0,
    startingPrice: row.starting_price ?? 0,
    rating: row.rating ?? 0,
    whyVisitCards: ((row.why_visit_cards as Destination["whyVisitCards"] | null)?.length
      ? row.why_visit_cards as Destination["whyVisitCards"]
      : local?.whyVisitCards ?? []),
    seasons: ((row.seasons as Destination["seasons"] | null)?.length
      ? row.seasons as Destination["seasons"]
      : local?.seasons ?? []),
    metaTitle: row.meta_title ?? row.name,
    metaDescription: row.meta_description ?? row.description ?? "",
  };
}

function buildAncestorSlugs(slug: string, slugToParent: Record<string, string | null>): string[] {
  const ancestors: string[] = [];
  let current = slugToParent[slug];
  while (current) {
    ancestors.push(current);
    current = slugToParent[current] ?? null;
  }
  return ancestors;
}

const DESTINATION_QUERY = "*, regions ( slug, name )";

const _fetchAllDestinations = unstable_cache(
  async (): Promise<Destination[]> => {
    const supabase = getSupabaseAnon();
    const { data, error } = await supabase
      .from("destinations")
      .select(DESTINATION_QUERY)
      .order("name");

    if (error) throw new Error(`getAllDestinations: ${error.message}`);
    const rows = data as unknown as DestinationWithRegion[];

    const idToSlug = Object.fromEntries(rows.map((r) => [r.id, r.slug]));
    const slugToParent: Record<string, string | null> = Object.fromEntries(
      rows.map((r) => [r.slug, r.parent_id ? (idToSlug[r.parent_id] ?? null) : null])
    );

    return rows.map((row) => {
      const parentSlug = row.parent_id ? (idToSlug[row.parent_id] ?? null) : null;
      return {
        ...toDestination(row),
        parentSlug,
        ancestorSlugs: buildAncestorSlugs(row.slug, slugToParent),
      };
    });
  },
  ["all-destinations"],
  { tags: ["destinations"], revalidate: 86400 }
);

// React cache deduplicates within a single request on top of the Next.js Data Cache
export const getAllDestinations = cache(_fetchAllDestinations);

export const getDestinationBySlug = cache(async (slug: string): Promise<Destination | null> => {
  const all = await getAllDestinations();
  return all.find((d) => d.slug === slug) ?? null;
});

export const getDestinationsByRegion = cache(
  async (regionSlug: string): Promise<Destination[]> => {
    const supabase = getSupabaseAnon();
    const { data, error } = await supabase
      .from("destinations")
      .select(DESTINATION_QUERY)
      .order("name");

    if (error) throw new Error(`getDestinationsByRegion: ${error.message}`);
    return (data as unknown as DestinationWithRegion[])
      .filter((d) => d.regions?.slug === regionSlug)
      .map(toDestination);
  }
);

export const getDestinationOptions = cache(async (): Promise<DestinationOption[]> => {
  const all = await getAllDestinations();
  const bySlug = Object.fromEntries(all.map((d) => [d.slug, d]));
  return all.map((d) => ({
    name: d.name,
    slug: d.slug,
    region: d.parentSlug
      ? (bySlug[d.parentSlug]?.name ?? d.name)
      : (REGION_NAMES[d.regionSlug] ?? d.regionSlug),
    parentSlug: d.parentSlug ?? null,
  }));
});

export const getFAQsByDestination = cache(
  async (destinationSlug: string): Promise<FAQ[]> => {
    const supabase = getSupabaseAnon();

    const { data: dest } = await supabase
      .from("destinations")
      .select("id")
      .eq("slug", destinationSlug)
      .single();

    if (!dest) return [];

    const { data, error } = await supabase
      .from("destination_faqs")
      .select("question, answer")
      .eq("destination_id", dest.id)
      .order("sort_order");

    if (error) throw new Error(`getFAQsByDestination: ${error.message}`);
    return (data ?? []).map((row) => ({ question: row.question, answer: row.answer }));
  }
);
