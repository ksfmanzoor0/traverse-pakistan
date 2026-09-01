import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readDestinationRankEntry } from "@/lib/packages/sortByDestinationRelevance";
import { readTourDestinationRankEntry } from "@/lib/tours/sortByDestinationRelevance";
import { DestinationPackagesEditor } from "@/components/admin/DestinationPackagesEditor";
import { DestinationBodyEditor } from "@/components/admin/DestinationBodyEditor";
import { saveDestinationPackageOverrides, saveDestinationTourOverrides, saveDestinationBodyBlocks } from "../actions";
import type { PackageRow, TourRow } from "@/lib/supabase/types";
import type { TourBlock } from "@/types/tour-block";

export const dynamic = "force-dynamic";

type DestinationLite = { slug: string; name: string; body_blocks: unknown | null };

async function fetchDestination(slug: string): Promise<DestinationLite | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("destinations")
    .select("slug, name, body_blocks")
    .eq("slug", slug)
    .maybeSingle();
  return (data as DestinationLite | null) ?? null;
}

async function fetchAncestorSlugs(slug: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.rpc("destination_slug_with_ancestors" as never, { p_slug: slug } as never);
  const slugs = ((data as string[] | null) ?? [slug]).filter(Boolean);
  return slugs;
}

async function fetchPackages(destinationSlug: string): Promise<PackageRow[]> {
  const supabase = getSupabaseAdmin();
  const slugs = await fetchAncestorSlugs(destinationSlug);
  const slugList = slugs.join(",");
  // Admin sees BOTH published and unpublished packages so nothing linked to
  // this destination is invisible. Unpublished ones get a badge; hidden ones
  // (destination_rank[slug].hidden) render greyed.
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .or(`destination_slug.in.(${slugList}),related_destination_slugs.ov.{${slugList}}`);
  if (error) throw new Error(error.message);
  return (data as unknown as PackageRow[]) ?? [];
}

async function fetchTours(destinationSlug: string): Promise<TourRow[]> {
  const supabase = getSupabaseAdmin();
  const slugs = await fetchAncestorSlugs(destinationSlug);
  const slugList = slugs.join(",");
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .or(`destination_slug.in.(${slugList}),related_destination_slugs.ov.{${slugList}}`);
  if (error) throw new Error(error.message);
  return (data as unknown as TourRow[]) ?? [];
}

export default async function AdminDestinationDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [dest, packages, tours] = await Promise.all([
    fetchDestination(slug),
    fetchPackages(slug),
    fetchTours(slug),
  ]);
  if (!dest) notFound();

  const initialPackages = packages.map((row) => {
    const entry = readDestinationRankEntry(row.destination_rank, slug);
    return {
      slug: row.slug,
      name: row.name,
      duration: row.duration,
      isPrimary: row.destination_slug === slug,
      published: row.published,
      hidden: !!entry.hidden,
      featured: !!entry.featured,
      rank: typeof entry.rank === "number" ? entry.rank : null,
    };
  });

  const initialTours = tours.map((row) => {
    const entry = readTourDestinationRankEntry(row.destination_rank, slug);
    return {
      slug: row.slug,
      name: row.name,
      duration: row.duration,
      isPrimary: row.destination_slug === slug,
      published: row.published,
      hidden: !!entry.hidden,
      featured: !!entry.featured,
      rank: typeof entry.rank === "number" ? entry.rank : null,
    };
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-[1100px]">
      <div>
        <Link href="/admin/destinations" className="text-[13px] text-[var(--text-tertiary)]">
          ← All destinations
        </Link>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)] mt-2">
          {dest.name}
        </h1>
        <p className="text-[13px] text-[var(--text-tertiary)] font-mono mt-1">/destinations/{dest.slug}</p>
      </div>

      <DestinationBodyEditor
        destinationSlug={slug}
        initialBlocks={(dest.body_blocks as TourBlock[] | null) ?? []}
        saveAction={saveDestinationBodyBlocks}
      />

      <section>
        <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">Packages</h2>
        <DestinationPackagesEditor
          destinationSlug={slug}
          initial={initialPackages}
          saveAction={saveDestinationPackageOverrides}
          resourceLabel="package"
        />
      </section>

      <section>
        <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-3">Group tours</h2>
        <DestinationPackagesEditor
          destinationSlug={slug}
          initial={initialTours}
          saveAction={saveDestinationTourOverrides}
          resourceLabel="tour"
        />
      </section>
    </div>
  );
}
