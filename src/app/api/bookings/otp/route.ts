import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getResend, FROM } from "@/lib/email/resend";
import { otpEmailHtml, otpEmailText } from "@/lib/email/templates/otpEmail";

const sendSchema = z.object({
  bookingRef: z.string().min(1),
  action: z.string().min(1), // e.g. "update your name" or "cancel your booking"
});

const verifySchema = z.object({
  bookingRef: z.string().min(1),
  code: z.string().length(6),
});

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function getContactEmail(bookingRef: string): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (bookingRef.startsWith("PKG-")) {
    const { data } = await supabase.from("package_bookings").select("contact_email").eq("booking_ref", bookingRef).single();
    return data?.contact_email ?? null;
  } else if (bookingRef.startsWith("HTL-")) {
    const { data } = await supabase.from("hotel_bookings").select("contact_email").eq("booking_ref", bookingRef).single();
    return data?.contact_email ?? null;
  } else {
    const { data } = await supabase.from("bookings").select("contact_email").eq("booking_ref", bookingRef).single();
    return data?.contact_email ?? null;
  }
}

// POST /api/bookings/otp — send OTP
export async function POST(req: NextRequest) {
  const body = sendSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { bookingRef, action } = body.data;
  const email = await getContactEmail(bookingRef);
  if (!email) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  try {
    const { error: sendError } = await getResend().emails.send({
      from: FROM,
      to: email,
      subject: `Your verification code — ${bookingRef}`,
      html: otpEmailHtml(code, bookingRef, action),
      text: otpEmailText(code, bookingRef, action),
    });
    if (sendError) {
      console.error("[otp/send] Resend error:", sendError);
      return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 502 });
    }
  } catch (err) {
    console.error("[otp/send] exception:", err);
    return NextResponse.json({ error: "Failed to send verification email. Please try again." }, { status: 502 });
  }

  const supabase = getSupabaseAdmin();
  await supabase.from("booking_otps").insert({ booking_ref: bookingRef, code, expires_at: expiresAt });

  return NextResponse.json({ sent: true });
}

// PUT /api/bookings/otp — verify OTP
export async function PUT(req: NextRequest) {
  const body = verifySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { bookingRef, code } = body.data;
  const supabase = getSupabaseAdmin();

  const { data } = await supabase
    .from("booking_otps")
    .select("id, expires_at, used")
    .eq("booking_ref", bookingRef)
    .eq("code", code)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code has expired" }, { status: 400 });
  }

  // Mark OTP as used
  await supabase.from("booking_otps").update({ used: true }).eq("id", data.id);

  return NextResponse.json({ verified: true });
}
