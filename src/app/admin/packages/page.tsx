import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PackagesListClient } from "@/components/admin/PackagesListClient";

export const dynamic = "force-dynamic";

type Row = {
  slug: string;
  name: string;
  destination_slug: string;
  region_slug: string;
  duration: number;
  published: boolean;
  updated_at: string | null;
};

async function fetchPackages(): Promise<Row[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("packages")
    .select("slug, name, destination_slug, region_slug, duration, published, updated_at")
    .order("name");
  if (error) throw new Error(error.message);
  return (data as Row[]) ?? [];
}

export default async function AdminPackagesPage() {
  const rows = await fetchPackages();
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Packages</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Edit package copy, itinerary meta, and visibility. Publish/hide-per-destination stays on{" "}
          <a href="/admin/destinations" className="underline">Destinations</a>. Engine cost tuning stays on{" "}
          <a href="/admin/cost-calculator" className="underline">Cost Calculator</a>.
        </p>
      </div>
      <PackagesListClient rows={rows} />
    </div>
  );
}
