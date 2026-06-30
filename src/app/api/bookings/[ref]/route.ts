import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireBookingOwner } from "@/lib/auth/requireBookingOwner";

// GET /api/bookings/[ref] — fetch full booking details (requires session + ownership).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  const guard = await requireBookingOwner(ref);
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();

  if (guard.table === "package_bookings") {
    const { data, error } = await supabase
      .from("package_bookings")
      .select("booking_ref, package_slug, tier, departure_city, start_date, adults, rooms, total_amount, currency, booking_status, refund_status, payment_status, contact_name, contact_email, contact_phone, notes, created_at")
      .eq("booking_ref", ref)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    return NextResponse.json({ type: "package", booking: data });
  }

  if (guard.table === "hotel_bookings") {
    const { data, error } = await supabase
      .from("hotel_bookings")
      .select("booking_ref, hotel_slug, checkin_date, checkout_date, nights, adults, children, total_amount, currency, booking_status, refund_status, payment_status, contact_name, contact_email, contact_phone, arrival_time, notes, created_at")
      .eq("booking_ref", ref)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    return NextResponse.json({ type: "hotel", booking: data });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_ref, departure_id, seats, single_rooms, total_amount, currency, status, booking_status, refund_status, contact_name, contact_email, contact_phone, notes, created_at")
    .eq("booking_ref", ref)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  return NextResponse.json({ type: "tour", booking: data });
}
