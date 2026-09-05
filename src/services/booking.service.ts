"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type {
  BookingRow,
  DepartureRow,
} from "@/lib/supabase/types";
import type {
  Booking,
  Departure,
  DepartureCity,
} from "@/types/booking";

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
    twinPrice: row.twin_price ?? 0,
    singlePrice: row.single_price ?? 0,
  };
}

export async function getUpcomingOpenDepartures(tourSlug: string): Promise<Departure[]> {
  if (!isSupabaseConfigured) return [];
  const supabase = getSupabaseBrowser();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("departures")
    .select("*")
    .eq("tour_slug", tourSlug)
    .eq("status", "open")
    .gte("departure_date", today)
    .order("departure_date", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toDeparture);
}

export async function getNextOpenDeparture(
  tourSlug: string,
  city?: DepartureCity
): Promise<Departure | null> {
  if (!isSupabaseConfigured) return null;
  const supabase = getSupabaseBrowser();
  const today = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("departures")
    .select("*")
    .eq("tour_slug", tourSlug)
    .eq("status", "open")
    .gte("departure_date", today);

  if (city) query = query.eq("departure_city", city);

  const { data, error } = await query
    .order("departure_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toDeparture(data) : null;
}

function toBooking(row: BookingRow): Booking {
  return {
    id: row.id,
    bookingRef: row.booking_ref,
    departureId: row.departure_id,
    seats: row.seats,
    singleRooms: row.single_rooms,
    totalAmount: row.total_amount,
    currency: row.currency,
    status: row.status,
    contact: {
      name: row.contact_name,
      email: row.contact_email,
      phone: row.contact_phone,
    },
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function getMyBookings(): Promise<Booking[]> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map(toBooking);
}

export async function getBookingByRef(ref: string): Promise<Booking | null> {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("booking_ref", ref)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toBooking(data) : null;
}
