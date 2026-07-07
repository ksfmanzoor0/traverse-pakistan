import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { quoteNotifyLimiter, checkRateLimit, clientIp } from "@/lib/ratelimit";
import { INVITATION_LETTER_PRICE_PKR, generateInvitationRef } from "@/lib/invitation/config";
import { sendInvitationLetterReceived } from "@/lib/email/sendInvitationLetterReceived";

const TravelerSchema = z.object({
  full_name: z.string().min(2).max(120),
  date_of_birth: z.string().min(4).max(20),
  nationality: z.string().min(2).max(60),
  passport_number: z.string().min(3).max(40),
  passport_expiry: z.string().min(4).max(20),
});

const Schema = z.object({
  contact_name: z.string().min(2).max(120),
  contact_email: z.string().email().max(200),
  contact_phone: z.string().min(6).max(40),
  embassy_country: z.string().min(2).max(80),
  embassy_city: z.string().min(2).max(80),
  arrival_date: z.string().min(4).max(20),
  departure_date: z.string().min(4).max(20),
  destinations: z.array(z.string().min(2).max(80)).min(1).max(20),
  travelers: z.array(TravelerSchema).min(1).max(20),
});

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

    const { error } = await supabase
      .from("invitation_requests" as never)
      .insert({
        ref,
        status: "pending_payment",
        contact_name: input.contact_name,
        contact_email: input.contact_email,
        contact_phone: input.contact_phone,
        embassy_country: input.embassy_country,
        embassy_city: input.embassy_city,
        arrival_date: input.arrival_date,
        departure_date: input.departure_date,
        destinations: input.destinations,
        travelers: input.travelers,
        amount_pkr: INVITATION_LETTER_PRICE_PKR,
      } as never);

    if (error) {
      console.error("[invitation-letter] insert failed:", error);
      return NextResponse.json({ error: "Could not create request" }, { status: 500 });
    }

    // Fire "we received your request" email now; the "paid" email lands after Alfa IPN.
    after(async () => {
      try {
        await sendInvitationLetterReceived({ ref, ...input });
      } catch (err) {
        console.error("[invitation-letter] received email failed:", err);
      }
    });

    return NextResponse.json({ ok: true, ref, amount_pkr: INVITATION_LETTER_PRICE_PKR });
  } catch (err) {
    console.error("[invitation-letter]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
