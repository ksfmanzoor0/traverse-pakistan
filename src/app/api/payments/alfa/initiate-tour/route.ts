import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { alfaConfig } from "@/lib/alfa/config";
import { generateAlfaHash } from "@/lib/alfa/hash";

const Schema = z.object({
  bookingRef: z.string().min(1),
  amount: z.number().positive(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = Schema.safeParse(raw);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { bookingRef, amount } = parsed.data;

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
      TransactionReferenceNumber: bookingRef,
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
