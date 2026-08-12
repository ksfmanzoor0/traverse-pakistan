import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { TourEditor } from "@/components/admin/TourEditor";
import { updateTour, upsertItineraryDay, deleteItineraryDay, upsertTourAddon, deleteTourAddon, upsertDeparture, deleteDeparture, renameTourSlugAndRedirect } from "../actions";
import type { TourRow, TourItineraryDayRow, TourAddonRow, DepartureRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

async function fetchTour(slug: string) {
  const supabase = getSupabaseAdmin();
  const [tourRes, daysRes, addonsRes, depsRes] = await Promise.all([
    supabase.from("tours").select("*").eq("slug", slug).maybeSingle(),
    supabase.from("tour_itinerary_days").select("*").eq("tour_slug", slug).order("day_number"),
    supabase.from("tour_addons").select("*").eq("tour_slug", slug).order("priority"),
    supabase.from("departures").select("*").eq("tour_slug", slug).order("departure_date"),
  ]);
  if (!tourRes.data) return null;
  return {
    tour: tourRes.data as TourRow,
    days: (daysRes.data ?? []) as TourItineraryDayRow[],
    addons: (addonsRes.data ?? []) as unknown as TourAddonRow[],
    departures: (depsRes.data ?? []) as DepartureRow[],
  };
}

export default async function AdminTourEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await fetchTour(slug);
  if (!data) notFound();
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <TourEditor
        tour={data.tour}
        days={data.days}
        addons={data.addons}
        departures={data.departures}
        actions={{
          updateTour,
          upsertItineraryDay,
          deleteItineraryDay,
          upsertTourAddon,
          deleteTourAddon,
          upsertDeparture,
          deleteDeparture,
          renameTourSlug: renameTourSlugAndRedirect,
        }}
      />
    </div>
  );
}
