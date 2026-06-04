import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getResend, buildMagicLinkEmail } from "@/lib/resend";

const schema = z.object({
  email: z.string().email().max(120),
  next: z.string().optional(),
});

// POST /api/auth/send-magic-link
// Body: { email, next? }
// Generates a magic-link URL and emails it via Resend. New emails are silently
// upserted by admin.generateLink — same flow works for sign-in and sign-up.
// Always returns 200 to prevent enumeration.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }

  const { email, next } = parsed.data;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/mybookings";

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
      console.warn("[send-magic-link] generateLink error:", error.message);
      return NextResponse.json({ ok: true });
    }

    // Construct a direct /auth/callback URL using the hashed token instead of
    // sending Supabase's intermediate /auth/v1/verify URL. On token failure
    // (Gmail prefetch consumed the token, TTL expired, etc.) errors land on
    // our route as query params — readable server-side — instead of in a
    // URL hash fragment we can't see. /auth/callback handles both the success
    // path (verifyOtp + session) and the error path (graceful redirect to
    // sign-in with a friendly "link expired, use the code" message).
    const tokenHash = data.properties?.hashed_token;
    const url = tokenHash
      ? `${origin}/auth/callback?token_hash=${tokenHash}&type=magiclink&next=${encodeURIComponent(safeNext)}`
      : data.properties?.action_link;

    // Independent OTP: generate our own 6-digit code and store it in
    // auth_otps. Clicking the magic link consumes Supabase's token; our OTP
    // remains valid (separate row, separate verification path). At verify
    // time we mint a fresh Supabase magic-link token server-side.
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h
    await admin.from("auth_otps").insert({ email, code, expires_at: expiresAt });

    const resend = getResend();
    const template = buildMagicLinkEmail(url, code);
    await resend.emails.send({ to: email, ...template });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-magic-link]", err);
    return NextResponse.json({ ok: true });
  }
}
