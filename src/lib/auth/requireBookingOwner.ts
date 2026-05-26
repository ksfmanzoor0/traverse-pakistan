import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";

type BookingTable = "package_bookings" | "hotel_bookings" | "bookings";

function tableFromRef(ref: string): BookingTable {
  if (ref.startsWith("PKG-")) return "package_bookings";
  if (ref.startsWith("HTL-")) return "hotel_bookings";
  return "bookings";
}

export interface RequireBookingOwnerResult {
  ok: true;
  userId: string;
  table: BookingTable;
  userIdOnBooking: string | null;
}

export interface RequireBookingOwnerError {
  ok: false;
  response: NextResponse;
}

// Verifies the request has a signed-in, verified_via_otp user who owns the booking.
// Returns either { ok: true, ... } with the matched user/table or { ok: false, response }
// with a ready-to-return NextResponse for the caller.
export async function requireBookingOwner(ref: string): Promise<RequireBookingOwnerResult | RequireBookingOwnerError> {
  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user;
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  }
  if (user.user_metadata?.verified_via_otp !== true) {
    return { ok: false, response: NextResponse.json({ error: "Verification required" }, { status: 403 }) };
  }

  const table = tableFromRef(ref);
  const admin = getSupabaseAdmin();
  const { data: booking, error } = await admin
    .from(table)
    .select("user_id")
    .eq("booking_ref", ref)
    .maybeSingle();

  if (error || !booking) {
    return { ok: false, response: NextResponse.json({ error: "Booking not found" }, { status: 404 }) };
  }
  if (booking.user_id && booking.user_id !== user.id) {
    return { ok: false, response: NextResponse.json({ error: "Not authorized" }, { status: 403 }) };
  }

  return { ok: true, userId: user.id, table, userIdOnBooking: (booking.user_id as string | null) ?? null };
}
