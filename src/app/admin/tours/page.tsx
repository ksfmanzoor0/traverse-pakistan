import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { ToursListClient, type TourRowLite } from "@/components/admin/ToursListClient";
import { duplicateTour, deleteTour, setTourPublished, setTourFeatured } from "./actions";

export const dynamic = "force-dynamic";

async function fetchTours(): Promise<TourRowLite[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("tours")
    .select("slug, name, destination_slug, region_slug, duration, category, anchor_city, published, featured")
    .order("name");
  if (error) throw new Error(error.message);
  return (data as TourRowLite[]) ?? [];
}

export default async function AdminToursPage() {
  const rows = await fetchTours();
  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Tours</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            Edit tour copy, itinerary, and addons. Departure dates &amp; seat inventory stay on{" "}
            <a href="/admin/departures" className="underline">Departures</a>.
          </p>
        </div>
        <Link
          href="/admin/tours/new"
          className="h-10 px-4 inline-flex items-center rounded-[var(--radius-sm)] text-[13px] font-semibold"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
        >
          + New tour
        </Link>
      </div>
      <ToursListClient rows={rows} duplicateAction={duplicateTour} deleteAction={deleteTour} setPublishedAction={setTourPublished} setFeaturedAction={setTourFeatured} />
    </div>
  );
}
