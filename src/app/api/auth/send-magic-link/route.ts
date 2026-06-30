import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getResend, buildMagicLinkEmail } from "@/lib/resend";
import { normalizePhone, phoneDigitsOnly } from "@/lib/auth/phone";
import { sendViewMyBookingsViaWhatsApp, isWhatsAppConfigured } from "@/lib/whatsapp/cloud";
import { otpSendLimiter, checkRateLimit } from "@/lib/ratelimit";

const schema = z.object({
  identifier: z.string().min(3).max(120),
  next: z.string().optional(),
});

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function siteUrl(req: NextRequest): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (env) return /^https?:\/\//i.test(env) ? env : `https://${env}`;
  return new URL(req.url).origin;
}

// POST /api/auth/send-magic-link
// Body: { identifier, next? }
// identifier = email OR WhatsApp number. Email path uses Resend; phone path
// looks up the user by phone and delivers a Supabase magic link via WhatsApp
// using the view_mybookings template. Always returns 200 to prevent enumeration.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });

  const { identifier, next } = parsed.data;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/mybookings";

  const trimmed = identifier.trim();
  // Cap magic-link sends per destination — keyed on the email/phone since
  // the abuse shape is mailbox/WhatsApp bombing the victim. Shares the same
  // bucket prefix as /api/bookings/otp so resend-spam can't be split across
  // both endpoints.
  if (looksLikeEmail(trimmed)) {
    const rlHit = await checkRateLimit(otpSendLimiter, `email:${trimmed.toLowerCase()}`);
    if (rlHit) return rlHit;
    return sendEmail(req, trimmed.toLowerCase(), safeNext);
  }

  const phone = normalizePhone(trimmed);
  if (!phone) return NextResponse.json({ ok: true });
  const rlHit = await checkRateLimit(otpSendLimiter, `whatsapp:${phone}`);
  if (rlHit) return rlHit;
  return sendWhatsApp(req, phone, safeNext);
}

async function sendEmail(req: NextRequest, email: string, safeNext: string) {
  const origin = new URL(req.url).origin;
  const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo },
    });
    if (error) {
      console.warn("[send-magic-link] generateLink (email):", error.message);
      return NextResponse.json({ ok: true });
    }
    // Construct a direct /auth/callback URL using the hashed token instead of
    // sending Supabase's intermediate /auth/v1/verify URL. On token failure
    // (Gmail prefetch consumed the token, TTL expired, etc.) errors land on
    // our route as query params — readable server-side — instead of in a
    // URL hash fragment we can't see. /auth/callback handles both the success
    // path (verifyOtp + session) and the error path (graceful redirect to
    // sign-in with a friendly "link expired, use the code" message).
    //
    // The `hint` param carries the email forward so /auth/callback can pass
    // it to /auth/sign-in on failure → form pre-fills → one-click resend.
    const tokenHash = data.properties?.hashed_token;
    const url = tokenHash
      ? `${origin}/auth/callback?token_hash=${tokenHash}&type=magiclink&next=${encodeURIComponent(safeNext)}&hint=${encodeURIComponent(email)}`
      : data.properties?.action_link;
    if (!url) return NextResponse.json({ ok: true });

    // Independent OTP fallback for email path
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    await admin.from("auth_otps").insert({ email, code, expires_at: expiresAt });

    const resend = getResend();
    const template = buildMagicLinkEmail(url, code);
    await resend.emails.send({ to: email, ...template });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-magic-link/email]", err);
    return NextResponse.json({ ok: true });
  }
}

async function sendWhatsApp(req: NextRequest, phone: string, safeNext: string) {
  if (!isWhatsAppConfigured()) return NextResponse.json({ ok: true });
  try {
    const admin = getSupabaseAdmin();
    const { data: userId } = await admin.rpc("find_auth_user_by_contact", {
      p_email: null,
      p_phone: phoneDigitsOnly(phone),
    });
    if (!userId) return NextResponse.json({ ok: true });

    const { data: userResult } = await admin.auth.admin.getUserById(userId);
    const user = userResult?.user;
    if (!user?.email) return NextResponse.json({ ok: true });

    // generateLink needs the user's email even if synthesized (wa-*@traverse.internal).
    const origin = siteUrl(req);
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { data: linkData, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: user.email,
      options: { redirectTo },
    });
    if (error || !linkData?.properties?.hashed_token) {
      console.warn("[send-magic-link] generateLink (phone):", error?.message);
      return NextResponse.json({ ok: true });
    }

    // Use the short /m/[ref]/[hash] form. There's no booking ref in this flow,
    // so use a 'me' sentinel — the redirect handler ignores it and only the
    // token_hash matters for sign-in. Keeps URL short for Meta's filter.
    const magicUrl = `${origin}/m/me/${linkData.properties.hashed_token}?next=${encodeURIComponent(safeNext)}`;

    const name = (user.user_metadata?.full_name as string | undefined) ?? "there";
    await sendViewMyBookingsViaWhatsApp({ toPhone: phone, name, magicLinkPath: magicUrl });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-magic-link/whatsapp]", err);
    return NextResponse.json({ ok: true });
  }
}
