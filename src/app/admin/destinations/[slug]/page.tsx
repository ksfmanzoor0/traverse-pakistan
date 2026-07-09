import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { readDestinationRankEntry } from "@/lib/packages/sortByDestinationRelevance";
import { DestinationPackagesEditor } from "@/components/admin/DestinationPackagesEditor";
import { saveDestinationPackageOverrides } from "../actions";
import type { PackageRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type DestinationLite = { slug: string; name: string };

async function fetchDestination(slug: string): Promise<DestinationLite | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("destinations")
    .select("slug, name")
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
  // Admin surfaces ALL packages (published + unpublished) so hidden/unpublished
  // ones are still reachable and manageable.
  const { data, error } = await supabase
    .from("packages")
    .select("*")
    .or(`destination_slug.in.(${slugList}),related_destination_slugs.ov.{${slugList}}`);
  if (error) throw new Error(error.message);
  return (data as unknown as PackageRow[]) ?? [];
}

export default async function AdminDestinationDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [dest, packages] = await Promise.all([fetchDestination(slug), fetchPackages(slug)]);
  if (!dest) notFound();

  const initial = packages.map((row) => {
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

      <DestinationPackagesEditor
        destinationSlug={slug}
        initial={initial}
        saveAction={saveDestinationPackageOverrides}
      />
    </div>
  );
}
