import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PackageEditor } from "@/components/admin/PackageEditor";
import { updatePackage, deletePackage, provisionR2Folder } from "../actions";

export const dynamic = "force-dynamic";

type Row = {
  slug: string;
  name: string;
  description: string;
  badge: string | null;
  duration: number;
  route: string | null;
  destination_slug: string;
  related_destination_slugs: string[] | null;
  region_slug: string;
  highlights: string[] | null;
  inclusions: string[] | null;
  exclusions: string[] | null;
  know_before_you_go: string[] | null;
  max_group_size: number | null;
  languages: string[] | null;
  published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string | null;
  pricing: {
    deluxe?: { islamabad?: number; lahore?: number; karachi?: number; singleSupplement?: number };
    luxury?: { islamabad?: number; lahore?: number; karachi?: number; singleSupplement?: number };
  } | null;
  starting_cities: string[] | null;
  total_distance_km: number | null;
  meals_per_person: number | null;
  entries_per_person: number | null;
  destination_rank: Record<string, number> | null;
};

type DestOption = { slug: string; name: string };
type RegionOption = { slug: string; name: string };

async function fetchPackage(slug: string): Promise<Row | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("packages")
    .select(
      "slug, name, description, badge, duration, route, destination_slug, related_destination_slugs, region_slug, highlights, inclusions, exclusions, know_before_you_go, max_group_size, languages, published, meta_title, meta_description, updated_at, pricing, starting_cities, total_distance_km, meals_per_person, entries_per_person, destination_rank",
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as Row | null) ?? null;
}

async function fetchOptions(): Promise<{ destinations: DestOption[]; regions: RegionOption[] }> {
  const supabase = getSupabaseAdmin();
  const [destRes, regRes] = await Promise.all([
    supabase.from("destinations").select("slug, name").order("name"),
    supabase.from("regions").select("slug, name").order("name"),
  ]);
  return {
    destinations: (destRes.data as DestOption[]) ?? [],
    regions: (regRes.data as RegionOption[]) ?? [],
  };
}

export default async function AdminPackageEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [row, options] = await Promise.all([fetchPackage(slug), fetchOptions()]);
  if (!row) notFound();

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <Link href="/admin/packages" className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          ← All packages
        </Link>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {row.name}
          </h1>
          <span className="text-[12px] font-mono" style={{ color: "var(--text-tertiary)" }}>
            {row.slug}
          </span>
          <a
            href={`/packages/${row.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] underline"
            style={{ color: "var(--primary)" }}
          >
            View live →
          </a>
          <Link
            href={`/admin/packages/${row.slug}/itinerary`}
            className="text-[12px] underline"
            style={{ color: "var(--primary)" }}
          >
            Edit itinerary →
          </Link>
        </div>
      </div>

      <PackageEditor
        row={row}
        destinationOptions={options.destinations}
        regionOptions={options.regions}
        updateAction={updatePackage}
        deleteAction={deletePackage}
        provisionR2Action={provisionR2Folder}
      />
    </div>
  );
}
