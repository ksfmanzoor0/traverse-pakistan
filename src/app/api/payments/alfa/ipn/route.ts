import { NextRequest, NextResponse } from "next/server";
import { alfaConfig } from "@/lib/alfa/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";

async function markBooking(bookingRef: string, isPaid: boolean) {
  const supabase = getSupabaseAdmin();
  if (bookingRef.startsWith("PKG-")) {
    await supabase
      .from("package_bookings")
      .update({
        payment_status: isPaid ? "paid" : "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  } else if (bookingRef.startsWith("HTL-")) {
    await supabase
      .from("hotel_bookings")
      .update({
        payment_status: isPaid ? "paid" : "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  } else {
    await supabase
      .from("bookings")
      .update({
        status: isPaid ? "confirmed" : "cancelled",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.formData().catch(() => null);
    const orderId = body?.get("orderId") as string | null;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId param" }, { status: 400 });
    }

    const ipnUrl = `${alfaConfig.ipnBaseUrl}/${alfaConfig.merchantId}/${alfaConfig.storeId}/${encodeURIComponent(orderId)}`;
    const statusRes = await fetch(ipnUrl);
    const status = await statusRes.json();

    const bookingRef: string = status.TransactionReferenceNumber ?? "";
    const isPaid: boolean = ["SUCCESS", "Paid", "P", "S"].includes(status.TransactionStatus ?? "");

    if (bookingRef) await markBooking(bookingRef, isPaid);

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("O");
  const rc = searchParams.get("RC");
  const ts = searchParams.get("TS");

  if (!orderId) {
    return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  }

  // RC=00 is Alfa's official success code — trust it directly without calling the IPN API,
  // which can be unreliable in sandbox and adds an extra failure point.
  if (rc === "00") {
    console.log("[alfa/ipn] RC=00 confirmed — marking paid. orderId:", orderId, "ts:", ts);
    await markBooking(orderId, true);
    return NextResponse.json({
      paid: true,
      bookingRef: orderId,
      transactionId: null,
      amount: null,
    });
  }

  // RC was not 00 — fall back to Alfa IPN status API
  try {
    const ipnUrl = `${alfaConfig.ipnBaseUrl}/${alfaConfig.merchantId}/${alfaConfig.storeId}/${orderId}`;
    const statusRes = await fetch(ipnUrl);
    const status = await statusRes.json();

    console.log("[alfa/ipn] IPN fallback — orderId:", orderId, "rc:", rc, "ts:", ts, "AlfaStatus:", JSON.stringify(status));

    const isPaid: boolean = ["SUCCESS", "Paid", "P", "S"].includes(status.TransactionStatus ?? "");
    const bookingRef: string = status.TransactionReferenceNumber ?? orderId;

    await markBooking(bookingRef, isPaid);

    return NextResponse.json({
      paid: isPaid,
      bookingRef,
      transactionId: status.TransactionId ?? null,
      amount: status.TransactionAmount ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[alfa/ipn] IPN fallback error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
