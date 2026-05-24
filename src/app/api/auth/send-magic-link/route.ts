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
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/account/trips";

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

    const url = data.properties?.action_link;
    if (!url) return NextResponse.json({ ok: true });

    // generateLink also returns an `email_otp` — the 6-digit equivalent of the
    // magic-link hashed_token. Include it in the email so the user can fall back
    // to manual code entry if the link doesn't work.
    const code = (data.properties as { email_otp?: string })?.email_otp ?? null;

    const resend = getResend();
    const template = buildMagicLinkEmail(url, code);
    await resend.emails.send({ to: email, ...template });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[send-magic-link]", err);
    return NextResponse.json({ ok: true });
  }
}
