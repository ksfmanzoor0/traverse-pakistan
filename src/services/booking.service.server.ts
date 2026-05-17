import { getSupabaseServer } from "@/lib/supabase/server";
import type { CreateBookingArgs, CreateBookingResult } from "@/lib/supabase/types";
import type { BookingSummary, CreateBookingInput } from "@/types/booking";

export interface PackageBookingRecord {
  bookingRef: string;
  totalAmount: number;
  paymentStatus: string;
  packageSlug: string;
}

export async function createBooking(input: CreateBookingInput): Promise<BookingSummary> {
  const supabase = await getSupabaseServer();

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

  const { data, error } = await supabase.rpc("create_booking", args);
  if (error) throw new Error(error.message);

  const result = Array.isArray(data) ? (data[0] as CreateBookingResult) : null;
  if (!result) throw new Error("Booking creation returned no data");

  return {
    bookingId: result.booking_id,
    bookingRef: result.booking_ref,
    totalAmount: result.total_amount,
  };
}

export async function getPackageBookingByRef(ref: string): Promise<PackageBookingRecord | null> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("package_bookings")
    .select("booking_ref, total_amount, payment_status, package_slug")
    .eq("booking_ref", ref)
    .maybeSingle();
  if (error || !data) return null;
  return {
    bookingRef: data.booking_ref as string,
    totalAmount: data.total_amount as number,
    paymentStatus: (data.payment_status as string) ?? "pending",
    packageSlug: data.package_slug as string,
  };
}
