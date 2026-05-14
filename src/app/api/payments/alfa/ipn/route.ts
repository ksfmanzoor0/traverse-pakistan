import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

async function markBooking(bookingRef: string, isPaid: boolean) {
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

// Alfa calls this server-to-server after payment settles
export async function POST(req: NextRequest) {
  try {
    const body = await req.formData().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    // Log all incoming params so we can inspect the IPN format
    const params: Record<string, string> = {};
    body.forEach((value, key) => { params[key] = String(value); });
    console.log("[alfa/ipn POST] incoming params:", JSON.stringify(params));

    const bookingRef = (
      params["TransactionReferenceNumber"] ??
      params["orderId"] ??
      params["OrderId"] ??
      ""
    );
    const txStatus = params["TransactionStatus"] ?? "";
    const isPaid = ["SUCCESS", "Paid", "P", "S"].includes(txStatus);

    console.log("[alfa/ipn POST] bookingRef:", bookingRef, "txStatus:", txStatus, "isPaid:", isPaid);

    if (bookingRef) await markBooking(bookingRef, isPaid);

    // Alfa expects HTTP 200 to acknowledge receipt
    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("[alfa/ipn POST] error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
