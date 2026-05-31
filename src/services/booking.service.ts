"use client";

import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type {
  BookingRow,
  CreateBookingArgs,
  CreateBookingResult,
  DepartureRow,
} from "@/lib/supabase/types";
import type {
  Booking,
  BookingSummary,
  CreateBookingInput,
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
    singleSupplement: row.single_supplement,
  };
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

export async function createBooking(
  input: CreateBookingInput
): Promise<BookingSummary> {
  if (!isSupabaseConfigured) {
    throw new Error("Online booking is not available. Please use WhatsApp.");
  }
  const supabase = getSupabaseBrowser();

  const args: CreateBookingArgs = {
    p_departure_id: input.departureId,
    p_seats: input.seats,
    p_single_rooms: input.singleRooms,
    p_contact_name: input.contact.name,
    p_contact_email: input.contact.email,
    p_contact_phone: input.contact.phone,
    p_participants: input.participants.map((p) => ({
      full_name: p.fullName ?? "",
      cnic_or_passport: p.cnicOrPassport ?? null,
      date_of_birth: p.dateOfBirth ?? null,
      dietary: p.dietary ?? null,
      emergency_contact: p.emergencyContact ?? null,
    })),
    p_notes: input.notes ?? null,
  };

  const { data, error } = await supabase.rpc("create_booking", { ...args, p_submit_uuid: input.submitUuid ?? null } as never);

  if (error) throw new Error(error.message);

  const result = Array.isArray(data) ? (data[0] as CreateBookingResult) : null;
  if (!result) throw new Error("Booking creation returned no data");

  return {
    bookingId: result.booking_id,
    bookingRef: result.booking_ref,
    totalAmount: result.total_amount,
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

export interface CreatePackageBookingInput {
  packageSlug: string;
  tier: "deluxe" | "luxury";
  departureCity: string;
  startDate: string | null;
  adults: number;
  rooms: number;
  totalAmount: number;
  contact: { name: string; email: string; phone: string };
  notes?: string;
  submitUuid?: string;
}

export interface PackageBookingSummary {
  bookingId: string;
  bookingRef: string;
  totalAmount: number;
}

export async function createPackageBooking(
  input: CreatePackageBookingInput
): Promise<PackageBookingSummary> {
  if (!isSupabaseConfigured) {
    throw new Error("Online booking is not available.");
  }
  const supabase = getSupabaseBrowser();

  const { data, error } = await supabase.rpc("create_package_booking", {
    p_package_slug: input.packageSlug,
    p_tier: input.tier,
    p_departure_city: input.departureCity,
    p_start_date: input.startDate ?? null,
    p_adults: input.adults,
    p_rooms: input.rooms,
    p_total_amount: input.totalAmount,
    p_contact_name: input.contact.name,
    p_contact_email: input.contact.email,
    p_contact_phone: input.contact.phone,
    p_notes: input.notes ?? null,
    p_submit_uuid: input.submitUuid ?? null,
  } as never);

  if (error) throw new Error(error.message);

  const result = Array.isArray(data) ? (data[0] as { booking_id: string; booking_ref: string; total_amount: number }) : null;
  if (!result) throw new Error("Package booking creation returned no data");

  return {
    bookingId: result.booking_id,
    bookingRef: result.booking_ref,
    totalAmount: result.total_amount,
  };
}

export interface HotelBookingLineItem {
  roomName: string;
  qty: number;
  adults: number;
  children: number;
  pricePerNight: number;
}

export interface CreateHotelBookingInput {
  hotelSlug: string;
  lineItems: HotelBookingLineItem[];
  checkinDate: string | null;
  checkoutDate: string | null;
  adults: number;      // booking total — sum of per-room adults
  children: number;   // booking total — sum of per-room children
  nights: number;
  totalAmount: number;
  contact: { name: string; email: string; phone: string };
  arrivalTime?: string;
  notes?: string;
  submitUuid?: string;
}

export interface HotelBookingSummary {
  bookingId: string;
  bookingRef: string;
  totalAmount: number;
}

export async function createHotelBooking(
  input: CreateHotelBookingInput
): Promise<HotelBookingSummary> {
  if (!isSupabaseConfigured) {
    throw new Error("Online booking is not available.");
  }
  const supabase = getSupabaseBrowser();

  // TODO(backend-testing): update RPC to accept line_items[] and insert hotel_booking_rooms rows
  const { data, error } = await supabase.rpc("create_hotel_booking", {
    p_hotel_slug: input.hotelSlug,
    p_checkin_date: input.checkinDate ?? null,
    p_checkout_date: input.checkoutDate ?? null,
    p_adults: input.adults,
    p_children: input.children,
    p_nights: input.nights,
    p_total_amount: input.totalAmount,
    p_contact_name: input.contact.name,
    p_contact_email: input.contact.email,
    p_contact_phone: input.contact.phone,
    p_arrival_time: input.arrivalTime ?? null,
    p_notes: input.notes ?? null,
    p_line_items: input.lineItems,
    p_submit_uuid: input.submitUuid ?? null,
  } as never);

  if (error) throw new Error(error.message);

  const result = Array.isArray(data) ? (data[0] as { booking_id: string; booking_ref: string; total_amount: number }) : null;
  if (!result) throw new Error("Hotel booking creation returned no data");

  return {
    bookingId: result.booking_id,
    bookingRef: result.booking_ref,
    totalAmount: result.total_amount,
  };
}
