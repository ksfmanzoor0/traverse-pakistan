import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { PackagesListClient } from "@/components/admin/PackagesListClient";
import { duplicatePackage } from "./actions";

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Packages</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Edit package copy, itinerary meta, and visibility. Publish/hide-per-destination stays on{" "}
            <a href="/admin/destinations" className="underline">Destinations</a>. Engine cost tuning stays on{" "}
            <a href="/admin/cost-calculator" className="underline">Cost Calculator</a>.
          </p>
        </div>
        <Link
          href="/admin/packages/new"
          className="h-10 px-4 inline-flex items-center rounded-[var(--radius-sm)] text-[13px] font-semibold"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
        >
          + New package
        </Link>
      </div>
      <PackagesListClient rows={rows} duplicateAction={duplicatePackage} />
    </div>
  );
}
