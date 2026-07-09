import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { quoteNotifyLimiter, checkRateLimit, clientIp } from "@/lib/ratelimit";
import { getInvitationLetterPricePkr, generateInvitationRef } from "@/lib/invitation/config";
import { sendInvitationLetterReceived } from "@/lib/email/sendInvitationLetterReceived";
import { stampBookingWithUser } from "@/lib/auth/stampBookingWithUser";

const TravelerSchema = z.object({
  surname: z.string().max(120).default(""),
  first_name: z.string().max(120).default(""),
  date_of_birth: z.string().max(20).default(""),
  nationality: z.string().max(60).default(""),
  passport_number: z.string().max(40).default(""),
  passport_expiry: z.string().max(20).default(""),
});

const Schema = z.object({
  contact_name: z.string().min(2).max(120),
  contact_email: z.string().email().max(200),
  contact_phone: z.string().min(6).max(40),
  embassy_country: z.string().max(80).default(""),
  embassy_city: z.string().max(80).default(""),
  arrival_date: z.string().max(20).default(""),
  departure_date: z.string().max(20).default(""),
  destinations: z.array(z.string().max(80)).max(20).default([]),
  travelers: z.array(TravelerSchema).max(20).default([]),
}).refine(
  (v) => !v.arrival_date || !v.departure_date || v.departure_date >= v.arrival_date,
  { message: "Departure date must be on or after arrival date", path: ["departure_date"] },
);

export async function POST(req: NextRequest) {
  try {
    const rlHit = await checkRateLimit(quoteNotifyLimiter, clientIp(req));
    if (rlHit) return rlHit;

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const ref = generateInvitationRef();
    const input = parsed.data;
    const pricePkr = await getInvitationLetterPricePkr();

    const { error } = await supabase
      .from("invitation_requests" as never)
      .insert({
        ref,
        status: "pending_payment",
        contact_name: input.contact_name,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone,
        embassy_country: input.embassy_country || null,
        embassy_city: input.embassy_city || null,
        arrival_date: input.arrival_date || null,
        departure_date: input.departure_date || null,
        destinations: input.destinations,
        travelers: input.travelers,
        amount_pkr: pricePkr,
      } as never);

    if (error) {
      console.error("[invitation-letter] insert failed:", error);
      return NextResponse.json({ error: "Could not create request" }, { status: 500 });
    }

    // Silent signup so tracking + My Bookings work even before payment.
    after(async () => {
      try { await stampBookingWithUser(ref); }
      catch (err) { console.error("[invitation-letter] stampBookingWithUser failed:", err); }
    });

    // Fire "we received your request" email now; the "paid" email lands after Alfa IPN.
    after(async () => {
      try {
        await sendInvitationLetterReceived({ ref, pricePkr, ...input });
      } catch (err) {
        console.error("[invitation-letter] received email failed:", err);
      }
    });

    return NextResponse.json({ ok: true, ref, amount_pkr: pricePkr });
  } catch (err) {
    console.error("[invitation-letter]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
