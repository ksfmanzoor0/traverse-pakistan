import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  slug: string;
  name: string;
  destination_slug: string;
  region_slug: string;
  duration: number;
  category: string;
  anchor_city: string | null;
  updated_at: string | null;
};

async function fetchTours(): Promise<Row[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tours")
    .select("slug, name, destination_slug, region_slug, duration, category, anchor_city, updated_at")
    .order("name");
  if (error) throw new Error(error.message);
  return (data as Row[]) ?? [];
}

export default async function AdminToursPage() {
  const rows = await fetchTours();
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Tours</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Edit tour copy, itinerary, and addons. Departure dates &amp; seat inventory stay on{" "}
          <a href="/admin/departures" className="underline">Departures</a>.
        </p>
      </div>

      <div className="border border-[var(--border-default)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] uppercase tracking-wide text-[11px]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Tour</th>
              <th className="px-4 py-2.5 font-semibold">Region</th>
              <th className="px-4 py-2.5 font-semibold">Days</th>
              <th className="px-4 py-2.5 font-semibold">Category</th>
              <th className="px-4 py-2.5 font-semibold">Anchor</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-t border-[var(--border-default)]">
                <td className="px-4 py-2.5">
                  <div className="font-semibold text-[var(--text-primary)]">{r.name}</div>
                  <div className="text-[11px] text-[var(--text-tertiary)]">{r.slug}</div>
                </td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.region_slug}</td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.duration}</td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.category}</td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.anchor_city ?? "—"}</td>
                <td className="px-4 py-2.5 text-right">
                  <Link
                    href={`/admin/tours/${r.slug}`}
                    className="text-[13px] font-semibold text-[var(--primary)] hover:underline"
                  >
                    Edit
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
