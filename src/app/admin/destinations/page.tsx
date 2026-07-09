import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DestRow = { slug: string; name: string; parent_id: string | null; regions: { name: string } | null };

async function fetchDestinations(): Promise<DestRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("destinations")
    .select("slug, name, parent_id, regions ( name )")
    .order("name");
  if (error) throw new Error(error.message);
  return (data as unknown as DestRow[]) ?? [];
}

export default async function AdminDestinationsPage() {
  const rows = await fetchDestinations();

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-[1100px]">
      <div>
        <h1 className="text-[24px] font-bold text-[var(--text-primary)]">Destinations</h1>
        <p className="text-[14px] text-[var(--text-tertiary)] mt-1">
          Manage which packages appear on each destination page — hide, feature, and reorder.
        </p>
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] overflow-hidden">
        <table className="min-w-full text-[14px]">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[13px]">
            <tr>
              <th className="text-left p-3">Destination</th>
              <th className="text-left p-3">Region</th>
              <th className="text-left p-3">Slug</th>
              <th className="text-right p-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.slug} className="border-t border-[var(--border-default)]">
                <td className="p-3 text-[var(--text-primary)] font-medium">{d.name}</td>
                <td className="p-3 text-[var(--text-secondary)]">{d.regions?.name ?? "—"}</td>
                <td className="p-3 text-[var(--text-tertiary)] font-mono text-[12px]">{d.slug}</td>
                <td className="p-3 text-right">
                  <Link
                    href={`/admin/destinations/${d.slug}`}
                    className="text-[13px] text-[var(--primary)] font-medium"
                  >
                    Manage packages →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
