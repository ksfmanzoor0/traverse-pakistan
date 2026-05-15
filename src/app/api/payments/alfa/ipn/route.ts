import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function markBooking(bookingRef: string, isPaid: boolean) {
  const supabase = getSupabaseAdmin();
  if (bookingRef.startsWith("PKG-")) {
    await supabase
      .from("package_bookings")
      .update({ payment_status: isPaid ? "paid" : "failed", updated_at: new Date().toISOString() })
      .eq("booking_ref", bookingRef);
  } else if (bookingRef.startsWith("HTL-")) {
    await supabase
      .from("hotel_bookings")
      .update({ payment_status: isPaid ? "paid" : "failed", updated_at: new Date().toISOString() })
      .eq("booking_ref", bookingRef);
  } else {
    await supabase
      .from("bookings")
      .update({ status: isPaid ? "confirmed" : "cancelled", updated_at: new Date().toISOString() })
      .eq("booking_ref", bookingRef);
  }
}

// Per Alfa docs: APG POSTs to the listener URL with a single "url" parameter
// containing the full IPN status API URL. We GET that URL to retrieve the status.
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData().catch(() => null);
    if (!body) {
      return new NextResponse("Bad request", { status: 400 });
    }

    const ipnUrl = body.get("url") as string | null;
    console.log("[alfa/ipn POST] received url param:", ipnUrl);

    if (!ipnUrl) {
      return new NextResponse("Missing url param", { status: 400 });
    }

    const statusRes = await fetch(ipnUrl);
    const raw = await statusRes.json();
    const status = typeof raw === "string" ? JSON.parse(raw) : raw;

    console.log("[alfa/ipn POST] status response:", JSON.stringify(status));

    const bookingRef: string = status.TransactionReferenceNumber ?? "";
    const isPaid: boolean = status.TransactionStatus === "Paid";

    console.log("[alfa/ipn POST] bookingRef:", bookingRef, "isPaid:", isPaid);

    if (bookingRef) await markBooking(bookingRef, isPaid);

    // Alfa expects HTTP 200 to acknowledge receipt
    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("[alfa/ipn POST] error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
