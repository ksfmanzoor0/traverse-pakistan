import { NextRequest, NextResponse } from "next/server";
import { alfaConfig } from "@/lib/alfa/config";
import { generateAlfaHash } from "@/lib/alfa/hash";
import { getSupabaseServer } from "@/lib/supabase/server";

interface Body {
  bookingRef: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: Body = await req.json();
    const { bookingRef } = body;

    if (!bookingRef) {
      return NextResponse.json({ error: "Missing bookingRef" }, { status: 400 });
    }

    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("package_bookings")
      .select("total_amount")
      .eq("booking_ref", bookingRef)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const amount: number = data.total_amount as number;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://traversepakistan.com";
    const returnUrl = `${siteUrl}/payments/package/return`;

    const hsParams: Record<string, string> = {
      HS_ChannelId: alfaConfig.channelId,
      HS_IsRedirectionRequest: "0",
      HS_MerchantId: alfaConfig.merchantId,
      HS_StoreId: alfaConfig.storeId,
      HS_ReturnURL: returnUrl,
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
      console.error("[alfa/initiate-package] HS non-JSON:", hsText.slice(0, 500));
      return NextResponse.json(
        { error: `Handshake error (HTTP ${hsResponse.status}): ${hsText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    if (!hsData.AuthToken) {
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
      TransactionAmount: String(amount),
    };

    const ssoHash = generateAlfaHash(ssoHashParams, alfaConfig.key1, alfaConfig.key2);

    return NextResponse.json({
      ssoUrl: alfaConfig.ssoUrl,
      ssoParams: { ...ssoHashParams, RequestHash: ssoHash },
      bookingRef,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[alfa/initiate-package]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
