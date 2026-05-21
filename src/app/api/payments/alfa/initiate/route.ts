import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { alfaConfig } from "@/lib/alfa/config";
import { generateAlfaHash } from "@/lib/alfa/hash";
import { createBooking } from "@/services/booking.service.server";
import { stampBookingWithUser } from "@/lib/auth/stampBookingWithUser";

const ParticipantSchema = z.object({
  fullName: z.string().max(100).optional(),
  cnicOrPassport: z.string().max(30).optional(),
  dateOfBirth: z.string().optional(),
  dietary: z.string().max(200).optional(),
  emergencyContact: z.string().max(100).optional(),
});

const BookingInputSchema = z.object({
  departureId: z.string().uuid(),
  seats: z.number().int().min(1).max(20),
  singleRooms: z.number().int().min(0).max(20),
  contact: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().min(7).max(20),
  }),
  participants: z.array(ParticipantSchema).min(1).max(20),
  notes: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = BookingInputSchema.safeParse(raw.booking);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid booking data", issues: parsed.error.issues },
        { status: 400 }
      );
    }

    const summary = await createBooking({
      ...parsed.data,
      contact: { ...parsed.data.contact, email: parsed.data.contact.email ?? "" },
    });

    await stampBookingWithUser(summary.bookingRef);

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
      HS_TransactionReferenceNumber: summary.bookingRef,
    };

    const requestHash = generateAlfaHash(hsParams, alfaConfig.key1, alfaConfig.key2);

    // APG expects form-urlencoded, not JSON
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
      console.error("[alfa/initiate] HS non-JSON response:", hsText.slice(0, 500));
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

    // PHP includes RequestHash="" (null) in the hash string before computing — order matters
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
      TransactionReferenceNumber: summary.bookingRef,
      TransactionAmount: Number(summary.totalAmount).toFixed(2),
    };

    const ssoHash = generateAlfaHash(ssoHashParams, alfaConfig.key1, alfaConfig.key2);

    return NextResponse.json({
      ssoUrl: alfaConfig.ssoUrl,
      ssoParams: { ...ssoHashParams, RequestHash: ssoHash },
      bookingRef: summary.bookingRef,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[alfa/initiate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
