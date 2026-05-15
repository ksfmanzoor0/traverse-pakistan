import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");

  if (!ref) {
    return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (ref.startsWith("PKG-")) {
    const { data, error } = await supabase
      .from("package_bookings")
      .select("booking_ref, payment_status, total_amount")
      .eq("booking_ref", ref)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ bookingRef: data.booking_ref, status: data.payment_status ?? "pending", amount: data.total_amount });
  }

  if (ref.startsWith("HTL-")) {
    const { data, error } = await supabase
      .from("hotel_bookings")
      .select("booking_ref, payment_status, total_amount")
      .eq("booking_ref", ref)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ bookingRef: data.booking_ref, status: data.payment_status ?? "pending", amount: data.total_amount });
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_ref, status, total_amount")
    .eq("booking_ref", ref)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const normalized =
    data.status === "confirmed" ? "paid" :
    data.status === "cancelled" ? "failed" : "pending";

  return NextResponse.json({ bookingRef: data.booking_ref, status: normalized, amount: data.total_amount });
}
