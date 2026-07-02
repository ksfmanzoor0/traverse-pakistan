// Server-side departure lookups. The main booking.service is "use client"
// (used by wizard/sidebar), so this file exposes the same queries via the
// server Supabase client for SSR/RSC contexts (e.g. tour detail page).

import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { DepartureRow } from "@/lib/supabase/types";
import type { Departure, DepartureCity } from "@/types/booking";

function toDeparture(row: DepartureRow): Departure {
  return {
    id: row.id,
    tourSlug: row.tour_slug,
    departureDate: row.departure_date,
    endDate: row.end_date,
    departureCity: row.departure_city,
    maxSeats: row.max_seats,
    seatsBooked: row.seats_booked,
    seatsAvailable: Math.max(0, row.max_seats - row.seats_booked),
    status: row.status,
    price: row.price,
    singleSupplement: row.single_supplement,
  };
}

export async function getUpcomingOpenDeparturesServer(tourSlug: string): Promise<Departure[]> {
  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("departures")
    .select("*")
    .eq("tour_slug", tourSlug)
    .eq("status", "open")
    .gte("departure_date", today)
    .order("departure_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => toDeparture(r as DepartureRow));
}

// Convenience helper for surfaces that need only the earliest open departure
// (e.g. the "next departure" chip on listing cards). Optionally filter by city.
export async function getNextOpenDepartureServer(
  tourSlug: string,
  city?: DepartureCity,
): Promise<Departure | null> {
  const supabase = getSupabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  let q = supabase
    .from("departures")
    .select("*")
    .eq("tour_slug", tourSlug)
    .eq("status", "open")
    .gte("departure_date", today);
  if (city) q = q.eq("departure_city", city);
  const { data, error } = await q.order("departure_date", { ascending: true }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toDeparture(data as DepartureRow) : null;
}
