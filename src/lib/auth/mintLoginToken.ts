import { getSupabaseAdmin } from "@/lib/supabase/server";

type BookingTable = "package_bookings" | "hotel_bookings" | "bookings";

function tableFromRef(bookingRef: string): BookingTable {
  if (bookingRef.startsWith("PKG-")) return "package_bookings";
  if (bookingRef.startsWith("HTL-")) return "hotel_bookings";
  return "bookings";
}

async function getUserIdForBooking(bookingRef: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const table = tableFromRef(bookingRef);
  if (table === "package_bookings") {
    const { data } = await supabase.from("package_bookings").select("user_id").eq("booking_ref", bookingRef).maybeSingle();
    return (data?.user_id as string | null) ?? null;
  }
  if (table === "hotel_bookings") {
    const { data } = await supabase.from("hotel_bookings").select("user_id").eq("booking_ref", bookingRef).maybeSingle();
    return (data?.user_id as string | null) ?? null;
  }
  const { data } = await supabase.from("bookings").select("user_id").eq("booking_ref", bookingRef).maybeSingle();
  return (data?.user_id as string | null) ?? null;
}

// Mints a fresh Supabase magic-link token for the user associated with a booking.
// Returns null on any failure — caller should degrade gracefully (button still works
// via /bookings/find fallback).
export async function mintLoginTokenForBooking(bookingRef: string): Promise<string | null> {
  try {
    const userId = await getUserIdForBooking(bookingRef);
    if (!userId) return null;

    const supabase = getSupabaseAdmin();
    const { data: userResult } = await supabase.auth.admin.getUserById(userId);
    const email = userResult?.user?.email;
    if (!email) return null;

    const { data: linkData, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error || !linkData?.properties?.hashed_token) return null;

    return linkData.properties.hashed_token;
  } catch (err) {
    console.error(`[mintLoginTokenForBooking] failed for ${bookingRef}:`, err);
    return null;
  }
}
