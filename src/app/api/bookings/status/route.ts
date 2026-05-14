import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { alfaConfig } from "@/lib/alfa/config";
import { markBooking } from "@/app/api/payments/alfa/ipn/route";

async function checkAlfaIPN(ref: string): Promise<"paid" | "failed" | "pending"> {
  try {
    const ipnUrl = `${alfaConfig.ipnBaseUrl}/${alfaConfig.merchantId}/${alfaConfig.storeId}/${ref}`;
    const res = await fetch(ipnUrl);
    const data = await res.json();
    if (data.TransactionStatus === "Paid") return "paid";
    if (data.ResponseCode === "00") return "paid";
    return "pending";
  } catch {
    return "pending";
  }
}

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

    let status = data.payment_status ?? "pending";

    // If DB still pending, ask Alfa directly (works in sandbox without listener whitelisting)
    if (status === "pending") {
      const alfaStatus = await checkAlfaIPN(ref);
      if (alfaStatus === "paid") {
        await markBooking(ref, true);
        status = "paid";
      }
    }

    return NextResponse.json({ bookingRef: data.booking_ref, status, amount: data.total_amount });
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

    let status = data.payment_status ?? "pending";

    if (status === "pending") {
      const alfaStatus = await checkAlfaIPN(ref);
      if (alfaStatus === "paid") {
        await markBooking(ref, true);
        status = "paid";
      }
    }

    return NextResponse.json({ bookingRef: data.booking_ref, status, amount: data.total_amount });
  }

  // Group tour bookings (bookings table uses status: confirmed/cancelled/pending)
  const { data, error } = await supabase
    .from("bookings")
    .select("booking_ref, status, total_amount")
    .eq("booking_ref", ref)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  let normalized =
    data.status === "confirmed" ? "paid" :
    data.status === "cancelled" ? "failed" :
    "pending";

  if (normalized === "pending") {
    const alfaStatus = await checkAlfaIPN(ref);
    if (alfaStatus === "paid") {
      await markBooking(ref, true);
      normalized = "paid";
    }
  }

  return NextResponse.json({ bookingRef: data.booking_ref, status: normalized, amount: data.total_amount });
}
