import { NextRequest, NextResponse } from "next/server";
import { markBooking } from "@/lib/payments/markBooking";

// Per Alfa docs: APG POSTs to the listener URL with "url" as a query parameter:
// e.g. /api/payments/alfa/ipn?url=https://sandbox.bankalfalah.com/HS/api/IPN/OrderStatus/...
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ipnUrl = searchParams.get("url");

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
    const rawAmount = status.TransactionAmount ?? status.Amount;
    const amountCharged: number | null =
      rawAmount != null && !Number.isNaN(Number(rawAmount)) ? Number(rawAmount) : null;

    console.log("[alfa/ipn POST] bookingRef:", bookingRef, "isPaid:", isPaid, "amount:", amountCharged);

    if (bookingRef) {
      // markBooking handles the confirmation send internally (guarded on the
      // first positive payment landing, safe against duplicate IPN calls).
      await markBooking(bookingRef, isPaid, amountCharged, "ipn");
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("[alfa/ipn POST] error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
