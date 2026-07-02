import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { alfaConfig } from "@/lib/alfa/config";
import { generateAlfaHash } from "@/lib/alfa/hash";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { paymentInitiateLimiter, checkRateLimit, clientIp } from "@/lib/ratelimit";

// Charges the outstanding balance on a booking whose deposit has already
// been captured. Works for both tour (TP-) and package (PKG-) refs. Hotels
// don't support installments so they're rejected here.

const Schema = z.object({
  bookingRef: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const rlHit = await checkRateLimit(paymentInitiateLimiter, clientIp(req));
    if (rlHit) return rlHit;

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { bookingRef } = parsed.data;

    if (bookingRef.startsWith("HTL-")) {
      return NextResponse.json({ error: "Balance charges are not supported for hotel bookings" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const table = bookingRef.startsWith("PKG-") ? "package_bookings" : "bookings";

    const { data: booking, error: dbError } = await supabase
      .from(table)
      .select("total_amount, payment_plan, amount_paid")
      .eq("booking_ref", bookingRef)
      .maybeSingle();

    if (dbError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.payment_plan !== "installments") {
      return NextResponse.json({ error: "Booking is not on the installments plan" }, { status: 400 });
    }

    const total = Number(booking.total_amount);
    const paid = Number(booking.amount_paid ?? 0);
    const balance = Math.max(0, total - paid);

    if (balance <= 0) {
      return NextResponse.json({ error: "Balance is already settled" }, { status: 400 });
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
      HS_TransactionReferenceNumber: bookingRef,
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
      console.error("[alfa/initiate-balance] HS non-JSON:", hsText.slice(0, 500));
      return NextResponse.json(
        { error: `Handshake error (HTTP ${hsResponse.status}): ${hsText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    if (!hsData.AuthToken) {
      console.error("[alfa/initiate-balance] HS failed:", JSON.stringify(hsData));
      return NextResponse.json(
        { error: hsData.ErrorMessage ?? "Handshake failed — no AuthToken" },
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
      TransactionReferenceNumber: bookingRef,
      TransactionAmount: balance.toFixed(2),
    };

    const ssoHash = generateAlfaHash(ssoHashParams, alfaConfig.key1, alfaConfig.key2);

    return NextResponse.json({
      ssoUrl: alfaConfig.ssoUrl,
      ssoParams: { ...ssoHashParams, RequestHash: ssoHash },
      balance,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[alfa/initiate-balance]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
