import { getSupabaseAdmin } from "@/lib/supabase/server";
import { findOrCreateUserForBooking } from "./findOrCreateUser";

type BookingTable = "package_bookings" | "hotel_bookings" | "bookings";

function tableFromRef(bookingRef: string): BookingTable {
  if (bookingRef.startsWith("PKG-")) return "package_bookings";
  if (bookingRef.startsWith("HTL-")) return "hotel_bookings";
  return "bookings";
}

async function fetchContact(table: BookingTable, bookingRef: string): Promise<{ contact_name: string; contact_email: string | null; contact_phone: string; user_id: string | null } | null> {
  const supabase = getSupabaseAdmin();
  if (table === "package_bookings") {
    const { data } = await supabase
      .from("package_bookings")
      .select("contact_name, contact_email, contact_phone, user_id")
      .eq("booking_ref", bookingRef)
      .maybeSingle();
    return data ? { contact_name: data.contact_name, contact_email: data.contact_email, contact_phone: data.contact_phone, user_id: data.user_id } : null;
  }
  if (table === "hotel_bookings") {
    const { data } = await supabase
      .from("hotel_bookings")
      .select("contact_name, contact_email, contact_phone, user_id")
      .eq("booking_ref", bookingRef)
      .maybeSingle();
    return data ? { contact_name: data.contact_name, contact_email: data.contact_email, contact_phone: data.contact_phone, user_id: data.user_id } : null;
  }
  const { data } = await supabase
    .from("bookings")
    .select("contact_name, contact_email, contact_phone, user_id")
    .eq("booking_ref", bookingRef)
    .maybeSingle();
  return data ? { contact_name: data.contact_name, contact_email: data.contact_email, contact_phone: data.contact_phone, user_id: data.user_id } : null;
}

async function updateUserId(table: BookingTable, bookingRef: string, userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (table === "package_bookings") {
    await supabase.from("package_bookings").update({ user_id: userId }).eq("booking_ref", bookingRef);
  } else if (table === "hotel_bookings") {
    await supabase.from("hotel_bookings").update({ user_id: userId }).eq("booking_ref", bookingRef);
  } else {
    await supabase.from("bookings").update({ user_id: userId }).eq("booking_ref", bookingRef);
  }
}

// Best-effort silent signup: looks up the booking, finds-or-creates an auth.users
// row for the contact, stamps the booking with user_id. Never throws — failures
// are logged but should not break the payment flow.
export async function stampBookingWithUser(bookingRef: string): Promise<void> {
  try {
    const table = tableFromRef(bookingRef);
    const record = await fetchContact(table, bookingRef);
    if (!record) {
      console.warn(`[stampBookingWithUser] booking not found: ${bookingRef}`);
      return;
    }
    if (record.user_id) return; // Already stamped.

    const result = await findOrCreateUserForBooking({
      name: record.contact_name,
      email: record.contact_email || null,
      phone: record.contact_phone,
    });

    await updateUserId(table, bookingRef, result.userId);
  } catch (err) {
    console.error(`[stampBookingWithUser] exception for ${bookingRef}:`, err);
  }
}
