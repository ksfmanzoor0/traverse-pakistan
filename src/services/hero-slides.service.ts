import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseAnon } from "@/lib/supabase/server";

export type HeroSlide = {
  id: string;
  url: string;
  alt: string;
  position: number;
  published: boolean;
};

const FALLBACK_SLIDES: HeroSlide[] = [1, 14, 16, 9, 12, 15, 10].map((n, i) => ({
  id: `fallback-${n}`,
  url: `https://media.traversepakistan.com/homepageslider/${n}.jpg`,
  alt: "Pakistan travel destination",
  position: (i + 1) * 10,
  published: true,
}));

async function fetchPublishedSlidesInner(): Promise<HeroSlide[]> {
  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const supabase = getSupabaseAnon() as any;
    const { data, error } = await supabase
      .from("hero_slides")
      .select("id, url, alt, position, published")
      .eq("published", true)
      .order("position", { ascending: true });
    /* eslint-enable @typescript-eslint/no-explicit-any */
    if (error || !Array.isArray(data) || data.length === 0) return FALLBACK_SLIDES;
    return (data as unknown as HeroSlide[]).map((r) => ({
      id: String(r.id),
      url: r.url,
      alt: r.alt || "Pakistan travel destination",
      position: r.position ?? 0,
      published: !!r.published,
    }));
  } catch {
    return FALLBACK_SLIDES;
  }
}

export const getPublishedHeroSlides = cache(
  unstable_cache(fetchPublishedSlidesInner, ["hero-slides-published"], {
    tags: ["hero-slides"],
    revalidate: 300,
  }),
);

export async function getAllHeroSlides(): Promise<HeroSlide[]> {
  const { getSupabaseAdmin } = await import("@/lib/supabase/server");
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const supabase = getSupabaseAdmin() as any;
  const { data, error } = await supabase
    .from("hero_slides")
    .select("id, url, alt, position, published")
    .order("position", { ascending: true });
  /* eslint-enable @typescript-eslint/no-explicit-any */
  if (error) throw new Error(error.message);
  return (data as unknown as HeroSlide[]).map((r) => ({
    id: String(r.id),
    url: r.url,
    alt: r.alt || "Pakistan travel destination",
    position: r.position ?? 0,
    published: !!r.published,
  }));
}
