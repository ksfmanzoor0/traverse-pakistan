import { cache } from "react";
import { getSupabaseAnon } from "@/lib/supabase/server";
import type { RegionRow } from "@/lib/supabase/types";
import type { Region } from "@/types/region";
import type { TourBlock } from "@/types/tour-block";

function toRegion(row: RegionRow & { destinations: { slug: string }[] }): Region {
  const blocks = Array.isArray(row.body_blocks) ? (row.body_blocks as TourBlock[]) : [];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    heroImage: row.image_url ?? "",
    description: row.description ?? "",
    destinationSlugs: row.destinations.map((d) => d.slug),
    tourCount: 0,
    metaTitle: row.name,
    metaDescription: row.description ?? "",
    bodyBlocks: blocks,
  };
}

const REGION_QUERY = "*, destinations ( slug )";

export const getAllRegions = cache(async (): Promise<Region[]> => {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("regions")
    .select(REGION_QUERY)
    .order("name");

  if (error) throw new Error(`getAllRegions: ${error.message}`);
  return (data as unknown as (RegionRow & { destinations: { slug: string }[] })[]).map(toRegion);
});

export const getRegionBySlug = cache(async (slug: string): Promise<Region | null> => {
  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from("regions")
    .select(REGION_QUERY)
    .eq("slug", slug)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(`getRegionBySlug: ${error.message}`);
  return toRegion(data as unknown as RegionRow & { destinations: { slug: string }[] });
});
