import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const schema = z.object({
  email: z.string().email().max(120),
  code: z.string().length(6),
});

// POST /api/auth/verify-otp
// Body: { email, code }
// Validates our custom OTP (auth_otps), then mints a fresh Supabase magic-link
// token bound to that email. Returns { tokenHash } the client exchanges for a
// session via supabase.auth.verifyOtp({ token_hash, type: 'magiclink' }).
//
// Independent from the magic-link URL in the email: clicking the link consumes
// Supabase's token but does NOT affect our auth_otps row. Vice versa.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { email, code } = parsed.data;
  const admin = getSupabaseAdmin();

  const { data: otpRow } = await admin
    .from("auth_otps")
    .select("id, expires_at, used")
    .eq("email", email.toLowerCase())
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
  await admin.from("auth_otps").update({ used: true }).eq("id", otpRow.id);

  // Mint a fresh magic-link token for this email. generateLink creates the
  // auth.users row if it doesn't exist (sign-up flow) and returns a token
  // the client consumes to establish a session.
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (linkError || !linkData?.properties?.hashed_token) {
    console.error("[auth/verify-otp] generateLink failed:", linkError);
    return NextResponse.json({ error: "Could not create session" }, { status: 500 });
  }

  return NextResponse.json({
    verified: true,
    tokenHash: linkData.properties.hashed_token,
    type: "magiclink",
  });
}
