import { NextRequest, NextResponse } from "next/server";
import { markBooking } from "@/lib/payments/markBooking";
import { stripAttemptSuffix } from "@/lib/alfa/txnRef";

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

    // Alfa echoes back the exact TransactionReferenceNumber we sent it,
    // including the per-attempt suffix. Strip that so markBooking looks up
    // and updates the parent booking row.
    const rawRef: string = status.TransactionReferenceNumber ?? "";
    const bookingRef = stripAttemptSuffix(rawRef);
    const isPaid: boolean = status.TransactionStatus === "Paid";
    const rawAmount = status.TransactionAmount ?? status.Amount;
    const amountCharged: number | null =
      rawAmount != null && !Number.isNaN(Number(rawAmount)) ? Number(rawAmount) : null;

    console.log("[alfa/ipn POST] bookingRef:", bookingRef, "isPaid:", isPaid, "amount:", amountCharged);

    if (bookingRef) {
      // Pass the suffixed rawRef (Alfa's TransactionReferenceNumber) so
      // markBooking's ledger guard can reject duplicate deliveries of the
      // same charge.
      await markBooking(bookingRef, isPaid, amountCharged, "ipn", rawRef || null);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err) {
    console.error("[alfa/ipn POST] error:", err);
    return new NextResponse("Error", { status: 500 });
  }
}
