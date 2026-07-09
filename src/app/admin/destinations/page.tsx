import { getSupabaseAdmin } from "@/lib/supabase/server";
import { DestinationsListClient } from "@/components/admin/DestinationsListClient";

export const dynamic = "force-dynamic";

type DestRow = { slug: string; name: string; parent_id: string | null; regions: { name: string } | null };

async function fetchParentDestinations(): Promise<DestRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("destinations")
    .select("slug, name, parent_id, regions ( name )")
    .is("parent_id", null)
    .order("name");
  if (error) throw new Error(error.message);
  return (data as unknown as DestRow[]) ?? [];
}

export default async function AdminDestinationsPage() {
  const rows = await fetchParentDestinations();

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)]">Destinations</h1>
        <p className="text-[14px] text-[var(--text-tertiary)] mt-1">
          Manage which packages appear on each destination page — hide, feature, and reorder.
        </p>
      </div>

      <DestinationsListClient
        rows={rows.map((d) => ({ slug: d.slug, name: d.name, region: d.regions?.name ?? null }))}
      />
    </div>
  );
}
