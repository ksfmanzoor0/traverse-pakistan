import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getResend, FROM } from "@/lib/email/resend";
import { otpEmailHtml, otpEmailText } from "@/lib/email/templates/otpEmail";
import { normalizePhone } from "@/lib/auth/phone";
import { sendOtpViaWhatsApp, isWhatsAppConfigured } from "@/lib/whatsapp/cloud";

const sendSchema = z.object({
  identifier: z.string().min(3).max(120),
  channel: z.enum(["email", "whatsapp"]),
});

const verifySchema = z.object({
  identifier: z.string().min(3).max(120),
  code: z.string().length(6),
});

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

// Returns { email, phone } pair extracted from a free-text identifier.
// Email values pass through; phone-like strings get E.164-normalized.
function splitIdentifier(identifier: string): { email: string | null; phone: string | null } {
  const trimmed = identifier.trim();
  if (looksLikeEmail(trimmed)) return { email: trimmed.toLowerCase(), phone: null };
  const phone = normalizePhone(trimmed);
  return { email: null, phone: phone || null };
}

// POST /api/bookings/otp — send a 6-digit code via the chosen channel.
// Always returns 200 to prevent account enumeration; client never learns
// whether the identifier matched a user.
export async function POST(req: NextRequest) {
  const body = sendSchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { identifier, channel } = body.data;
  const { email, phone } = splitIdentifier(identifier);

  if (channel === "whatsapp" && !isWhatsAppConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp delivery is not configured yet. Please use email." },
      { status: 503 }
    );
  }

  const supabase = getSupabaseAdmin();

  const { data: userId } = await supabase.rpc("find_auth_user_by_contact", {
    p_email: email,
    p_phone: phone,
  });

  // If no user, still respond 200 to avoid enumeration.
  if (!userId) {
    return NextResponse.json({ sent: true });
  }

  const { data: userResult } = await supabase.auth.admin.getUserById(userId);
  if (!userResult?.user) {
    return NextResponse.json({ sent: true });
  }
  const user = userResult.user;

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  try {
    if (channel === "email") {
      const targetEmail = email ?? user.email ?? null;
      if (!targetEmail) {
        // Caller asked for email but identifier was a phone and the user has no real email.
        return NextResponse.json({ sent: true });
      }
      const { error: sendError } = await getResend().emails.send({
        from: FROM,
        to: targetEmail,
        subject: `Your Traverse Pakistan verification code`,
        html: otpEmailHtml(code, "your account", "verify your contact"),
        text: otpEmailText(code, "your account", "verify your contact"),
      });
      if (sendError) {
        console.error("[otp/send] Resend error:", sendError);
        return NextResponse.json({ error: "Could not send verification code. Please try again." }, { status: 502 });
      }
    } else {
      const targetPhone = phone ?? user.phone ?? null;
      if (!targetPhone) {
        return NextResponse.json({ sent: true });
      }
      const result = await sendOtpViaWhatsApp(targetPhone, code);
      if (!result.ok) {
        console.error("[otp/send] WhatsApp error:", result.error);
        return NextResponse.json({ error: "Could not send verification code. Please try again." }, { status: 502 });
      }
    }
  } catch (err) {
    console.error("[otp/send] exception:", err);
    return NextResponse.json({ error: "Could not send verification code. Please try again." }, { status: 502 });
  }

  await supabase.from("booking_otps").insert({
    booking_ref: "identity",
    code,
    expires_at: expiresAt,
    auth_user_id: user.id,
    channel,
  });

  return NextResponse.json({ sent: true });
}

// PUT /api/bookings/otp — verify the 6-digit code. On success, mark the user
// as verified_via_otp and return a Supabase magic-link token_hash the client
// can exchange for a session via supabase.auth.verifyOtp.
export async function PUT(req: NextRequest) {
  const body = verifySchema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { identifier, code } = body.data;
  const { email, phone } = splitIdentifier(identifier);

  const supabase = getSupabaseAdmin();

  const { data: userId } = await supabase.rpc("find_auth_user_by_contact", {
    p_email: email,
    p_phone: phone,
  });
  if (!userId) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  const { data: otpRow } = await supabase
    .from("booking_otps")
    .select("id, expires_at, used")
    .eq("auth_user_id", userId)
    .eq("code", code)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }
  if (new Date(otpRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code has expired" }, { status: 400 });
  }

  // Invalidate the OTP immediately so it can't be replayed.
  await supabase.from("booking_otps").update({ used: true }).eq("id", otpRow.id);

  const { data: userResult } = await supabase.auth.admin.getUserById(userId);
  if (!userResult?.user) {
    return NextResponse.json({ error: "Account not found" }, { status: 400 });
  }
  const user = userResult.user;

  // Flip the verified_via_otp flag — channel control proven.
  await supabase.auth.admin.updateUserById(user.id, {
    user_metadata: { ...(user.user_metadata ?? {}), verified_via_otp: true },
  });

  // Mint a magic-link token the client can consume for a real Supabase session.
  if (!user.email) {
    return NextResponse.json({ error: "Account is missing an email identity" }, { status: 500 });
  }

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
  });

  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[otp/verify] generateLink failed:", linkError);
    return NextResponse.json({ error: "Could not create session" }, { status: 500 });
  }

  return NextResponse.json({
    verified: true,
    tokenHash: linkData.properties.hashed_token,
    type: "magiclink",
    email: user.email,
  });
}
