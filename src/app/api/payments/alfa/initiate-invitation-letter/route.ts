import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { alfaConfig } from "@/lib/alfa/config";
import { generateAlfaHash } from "@/lib/alfa/hash";
import { withAttemptSuffix } from "@/lib/alfa/txnRef";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { paymentInitiateLimiter, checkRateLimit, clientIp } from "@/lib/ratelimit";

const Schema = z.object({ ref: z.string().min(1) });

export async function POST(req: NextRequest) {
  try {
    const rlHit = await checkRateLimit(paymentInitiateLimiter, clientIp(req));
    if (rlHit) return rlHit;
    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const { ref } = parsed.data;
    const supabase = getSupabaseAdmin();
    const { data: row, error: dbError } = await supabase
      .from("invitation_requests" as never)
      .select("amount_pkr, payment_attempts, status")
      .eq("ref", ref)
      .single();

    if (dbError || !row) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    const r = row as { amount_pkr: number; payment_attempts: number; status: string };
    if (r.status === "paid" || r.status === "issued") {
      return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    const amount = Number(r.amount_pkr);
    const nextAttempt = Number(r.payment_attempts ?? 0) + 1;
    const alfaTxnRef = withAttemptSuffix(ref, nextAttempt);

    const { error: bumpError } = await supabase
      .from("invitation_requests" as never)
      .update({ payment_attempts: nextAttempt } as never)
      .eq("ref", ref);
    if (bumpError) {
      console.error("[alfa/initiate-invitation-letter] bump failed:", bumpError);
      return NextResponse.json({ error: "Could not start payment. Please try again." }, { status: 500 });
    }

    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    const host = req.headers.get("host") ?? "traversepakistan.com";
    const returnUrl = `${proto}://${host}/payments/return`;

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
    const hsResponse = await fetch(alfaConfig.hsUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ ...hsParams, HS_RequestHash: requestHash }).toString(),
    });
    const hsText = await hsResponse.text();
    let hsData: Record<string, string>;
    try { hsData = JSON.parse(hsText); }
    catch {
      console.error("[alfa/initiate-invitation-letter] HS non-JSON:", hsText.slice(0, 500));
      return NextResponse.json({ error: `Handshake failed (HTTP ${hsResponse.status})` }, { status: 502 });
    }
    if (!hsData.AuthToken) {
      return NextResponse.json({ error: hsData.ErrorMessage ?? "Handshake failed" }, { status: 502 });
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
      TransactionAmount: amount.toFixed(2),
    };
    const ssoHash = generateAlfaHash(ssoHashParams, alfaConfig.key1, alfaConfig.key2);

    return NextResponse.json({
      ssoUrl: alfaConfig.ssoUrl,
      ssoParams: { ...ssoHashParams, RequestHash: ssoHash },
    });
  } catch (err) {
    console.error("[alfa/initiate-invitation-letter]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
