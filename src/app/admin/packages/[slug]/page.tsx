import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PackageEditor } from "@/components/admin/PackageEditor";
import {
  updatePackage,
  deletePackage,
  provisionR2Folder,
  renamePackageSlugAndRedirect,
  upsertPackageAddon,
  deletePackageAddon,
  saveItinerary,
} from "../actions";
import type { PackageRow, PackageItineraryDayRow, PackageAddonRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

type DestOption = { slug: string; name: string; region_slug: string | null };
type RegionOption = { slug: string; name: string };

type HotelOption = { slug: string; name: string; tier: string | null };

async function fetchAll(slug: string) {
  const supabase = getSupabaseAdmin();
  const [pkgRes, daysRes, addonsRes, hotelsRes] = await Promise.all([
    supabase.from("packages").select("*").eq("slug", slug).maybeSingle(),
    supabase.from("package_itinerary_days").select("*").eq("package_slug", slug).order("day_number"),
    supabase.from("package_addons").select("*").eq("package_slug", slug).order("priority"),
    supabase.from("hotels").select("slug, name, tier").order("name"),
  ]);
  if (!pkgRes.data) return null;
  return {
    row: pkgRes.data as PackageRow,
    days: (daysRes.data ?? []) as PackageItineraryDayRow[],
    addons: (addonsRes.data ?? []) as unknown as PackageAddonRow[],
    hotels: (hotelsRes.data as HotelOption[] | null) ?? [],
  };
}

async function fetchOptions(): Promise<{ destinations: DestOption[]; regions: RegionOption[] }> {
  const supabase = getSupabaseAdmin();
  const [destRes, regRes] = await Promise.all([
    supabase.from("destinations").select("slug, name, region_id").order("name"),
    supabase.from("regions").select("id, slug, name").order("name"),
  ]);
  type RegionRow = { id: string; slug: string; name: string };
  const regionsRows = (regRes.data as RegionRow[] | null) ?? [];
  const regionSlugById = new Map(regionsRows.map((r) => [r.id, r.slug]));
  type DestRawRow = { slug: string; name: string; region_id: string | null };
  const destRows = (destRes.data as DestRawRow[] | null) ?? [];
  const destinations: DestOption[] = destRows.map((d) => ({
    slug: d.slug,
    name: d.name,
    region_slug: d.region_id ? regionSlugById.get(d.region_id) ?? null : null,
  }));
  const regions: RegionOption[] = regionsRows.map((r) => ({ slug: r.slug, name: r.name }));
  return { destinations, regions };
}

export default async function AdminPackageEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, options] = await Promise.all([fetchAll(slug), fetchOptions()]);
  if (!data) notFound();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link href="/admin/packages" className="text-[12px] text-[var(--text-secondary)] hover:underline">
          ← All packages
        </Link>
      </div>

      <PackageEditor
        row={data.row}
        days={data.days}
        addons={data.addons}
        hotels={data.hotels}
        destinationOptions={options.destinations}
        regionOptions={options.regions}
        actions={{
          updatePackage,
          deletePackage,
          provisionR2Folder,
          renamePackageSlug: renamePackageSlugAndRedirect,
          upsertPackageAddon,
          deletePackageAddon,
          saveItinerary,
        }}
      />
    </div>
  );
}
