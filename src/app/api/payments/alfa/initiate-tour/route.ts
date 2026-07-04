import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { alfaConfig } from "@/lib/alfa/config";
import { generateAlfaHash } from "@/lib/alfa/hash";
import { withAttemptSuffix } from "@/lib/alfa/txnRef";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { paymentInitiateLimiter, checkRateLimit, clientIp } from "@/lib/ratelimit";

const Schema = z.object({
  bookingRef: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const rlHit = await checkRateLimit(paymentInitiateLimiter, clientIp(req));
    if (rlHit) return rlHit;
    const raw = await req.json();
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { bookingRef } = parsed.data;

    // The payment plan + deposit are locked at booking creation (create_booking
    // RPC), so we read them here rather than trusting the client.
    const supabase = getSupabaseAdmin();
    const { data: booking, error: dbError } = await supabase
      .from("bookings")
      .select("total_amount, payment_plan, deposit_amount, payment_attempts")
      .eq("booking_ref", bookingRef)
      .single();

    if (dbError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const totalAmount = Number(booking.total_amount);
    const amount = booking.payment_plan === "installments" && booking.deposit_amount
      ? Number(booking.deposit_amount)
      : totalAmount;

    // Alfa rejects re-use of TransactionReferenceNumber ("Invalid Request"),
    // so bump the attempt counter and suffix the ref before sending. IPN +
    // status routes strip the suffix so markBooking sees the parent ref.
    const nextAttempt = Number(booking.payment_attempts ?? 0) + 1;
    const alfaTxnRef = withAttemptSuffix(bookingRef, nextAttempt);
    const { error: bumpError } = await supabase
      .from("bookings")
      .update({ payment_attempts: nextAttempt })
      .eq("booking_ref", bookingRef);
    if (bumpError) {
      console.error("[alfa/initiate-tour] failed to bump payment_attempts:", bumpError);
      return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
    }

    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("host") ?? "traversepakistan.com";
    const siteUrl = `${proto}://${host}`;
    const returnUrl = `${siteUrl}/payments/return`;

    const hsParams: Record<string, string> = {
      HS_RequestHash: "",
      HS_IsRedirectionRequest: "0",
      HS_ChannelId: alfaConfig.channelId,
      HS_ReturnURL: returnUrl,
      HS_MerchantId: alfaConfig.merchantId,
      HS_StoreId: alfaConfig.storeId,
      HS_MerchantHash: alfaConfig.merchantHash,
      HS_MerchantUsername: alfaConfig.merchantUsername,
      HS_MerchantPassword: alfaConfig.merchantPassword,
      HS_TransactionReferenceNumber: alfaTxnRef,
    };

    const requestHash = generateAlfaHash(hsParams, alfaConfig.key1, alfaConfig.key2);

    const hsFormBody = new URLSearchParams({ ...hsParams, HS_RequestHash: requestHash });
    const hsResponse = await fetch(alfaConfig.hsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: hsFormBody.toString(),
    });

    const hsText = await hsResponse.text();
    let hsData: Record<string, string>;
    try {
      hsData = JSON.parse(hsText);
    } catch {
      console.error("[alfa/initiate-tour] HS non-JSON response:", hsText.slice(0, 500));
      return NextResponse.json(
        { error: `Handshake returned unexpected response (HTTP ${hsResponse.status}): ${hsText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    if (!hsData.AuthToken) {
      return NextResponse.json(
        { error: hsData.ErrorMessage ?? "Handshake failed — no AuthToken returned" },
        { status: 502 }
      );
    }

    const ssoHashParams: Record<string, string> = {
      AuthToken: hsData.AuthToken,
      RequestHash: "",
      ChannelId: alfaConfig.channelId,
      Currency: "PKR",
      IsBIN: "0",
      ReturnURL: returnUrl,
      MerchantId: alfaConfig.merchantId,
      StoreId: alfaConfig.storeId,
      MerchantHash: alfaConfig.merchantHash,
      MerchantUsername: alfaConfig.merchantUsername,
      MerchantPassword: alfaConfig.merchantPassword,
      TransactionTypeId: "3",
      TransactionReferenceNumber: alfaTxnRef,
      TransactionAmount: Number(amount).toFixed(2),
    };

    const ssoHash = generateAlfaHash(ssoHashParams, alfaConfig.key1, alfaConfig.key2);

    return NextResponse.json({
      ssoUrl: alfaConfig.ssoUrl,
      ssoParams: { ...ssoHashParams, RequestHash: ssoHash },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[alfa/initiate-tour]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
