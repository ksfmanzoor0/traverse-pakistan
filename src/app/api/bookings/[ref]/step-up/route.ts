import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getResend, FROM } from "@/lib/email/resend";
import { otpEmailHtml, otpEmailText } from "@/lib/email/templates/otpEmail";
import { sendOtpViaWhatsApp, sendBookingConfirmedViaWhatsApp, isWhatsAppConfigured } from "@/lib/whatsapp/cloud";
import { isSynthesizedEmail } from "@/lib/auth/phone";
import { mintLoginTokenForBooking } from "@/lib/auth/mintLoginToken";

type BookingTable = "package_bookings" | "hotel_bookings" | "bookings";

function tableFromRef(ref: string): BookingTable {
  if (ref.startsWith("PKG-")) return "package_bookings";
  if (ref.startsWith("HTL-")) return "hotel_bookings";
  return "bookings";
}

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!raw) return "https://traversepakistan.com";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

interface UserBundle {
  userId: string;
  email: string;
  realEmail: string | null;
  phone: string;
  contactName: string;
}

async function loadUserForBooking(ref: string): Promise<UserBundle | null> {
  const supabase = getSupabaseAdmin();
  const table = tableFromRef(ref);

  let userId: string | null = null;
  let phone = "";
  let contactName = "";

  if (table === "package_bookings") {
    const { data } = await supabase.from("package_bookings").select("user_id, contact_phone, contact_name").eq("booking_ref", ref).maybeSingle();
    if (!data) return null;
    userId = data.user_id as string | null;
    phone = data.contact_phone;
    contactName = data.contact_name;
  } else if (table === "hotel_bookings") {
    const { data } = await supabase.from("hotel_bookings").select("user_id, contact_phone, contact_name").eq("booking_ref", ref).maybeSingle();
    if (!data) return null;
    userId = data.user_id as string | null;
    phone = data.contact_phone;
    contactName = data.contact_name;
  } else {
    const { data } = await supabase.from("bookings").select("user_id, contact_phone, contact_name").eq("booking_ref", ref).maybeSingle();
    if (!data) return null;
    userId = data.user_id as string | null;
    phone = data.contact_phone;
    contactName = data.contact_name;
  }

  if (!userId) return null;

  const { data: userResult } = await supabase.auth.admin.getUserById(userId);
  const email = userResult?.user?.email ?? null;
  if (!email) return null;

  return {
    userId,
    email,
    realEmail: isSynthesizedEmail(email) ? null : email,
    phone,
    contactName,
  };
}

// POST /api/bookings/[ref]/step-up
// Triggers a magic-link send (email + WhatsApp) AND stores a 6-digit OTP as
// fallback. Always returns 200 to avoid revealing booking existence.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const bundle = await loadUserForBooking(ref);
  if (!bundle) return NextResponse.json({ sent: true });

  const supabase = getSupabaseAdmin();

  // Generate magic link for the email/whatsapp channels
  const { data: linkData } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: bundle.email,
  });
  const tokenHash = linkData?.properties?.hashed_token ?? null;
  const magicUrl = tokenHash
    ? `${siteUrl()}/auth/callback?token_hash=${tokenHash}&type=magiclink&next=${encodeURIComponent(`/bookings/${ref}`)}`
    : null;

  // 6-digit OTP fallback — store keyed by the auth user
  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await supabase.from("booking_otps").insert({
    booking_ref: ref,
    code,
    expires_at: expiresAt,
    auth_user_id: bundle.userId,
    channel: "email",
  });

  // Email dispatch (skip when synthesized)
  if (bundle.realEmail) {
    try {
      await getResend().emails.send({
        from: FROM,
        to: bundle.realEmail,
        subject: `Verify to manage booking ${ref}`,
        html: otpEmailHtml(code, ref, "manage your booking", magicUrl),
        text: otpEmailText(code, ref, "manage your booking", magicUrl),
      });
    } catch (err) {
      console.error("[step-up] email send failed:", err);
    }
  }

  // WhatsApp dispatch — magic link (utility template) + OTP (authentication template)
  if (isWhatsAppConfigured()) {
    if (magicUrl) {
      sendBookingConfirmedViaWhatsApp({
        toPhone: bundle.phone,
        name: bundle.contactName,
        bookingRef: ref,
        magicLinkPath: magicUrl,
      }).catch((err) => console.error("[step-up] WhatsApp magic link failed:", err));
    }
    sendOtpViaWhatsApp(bundle.phone, code).catch((err) =>
      console.error("[step-up] WhatsApp OTP failed:", err)
    );
  }

  return NextResponse.json({ sent: true });
}

// PUT /api/bookings/[ref]/step-up
// Body: { code }
// Verifies the 6-digit code, flips verified_via_otp, returns a tokenHash
// the client consumes via supabase.auth.verifyOtp to refresh its session.
const verifySchema = z.object({ code: z.string().length(6) });

export async function PUT(req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const body = verifySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

  const bundle = await loadUserForBooking(ref);
  if (!bundle) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });

  const supabase = getSupabaseAdmin();

  const { data: otpRow } = await supabase
    .from("booking_otps")
    .select("id, expires_at, used")
    .eq("auth_user_id", bundle.userId)
    .eq("code", body.data.code)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow) return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  if (new Date(otpRow.expires_at) < new Date()) {
    return NextResponse.json({ error: "Code has expired" }, { status: 400 });
  }

  await supabase.from("booking_otps").update({ used: true }).eq("id", otpRow.id);

  // Fetch current metadata, flip the flag.
  const { data: userResult } = await supabase.auth.admin.getUserById(bundle.userId);
  const currentMeta = (userResult?.user?.user_metadata as Record<string, unknown> | undefined) ?? {};
  await supabase.auth.admin.updateUserById(bundle.userId, {
    user_metadata: { ...currentMeta, verified_via_otp: true },
  });

  // Mint a fresh login token so the client can refresh into a session
  // whose JWT reflects the updated metadata.
  const tokenHash = await mintLoginTokenForBooking(ref);
  if (!tokenHash) return NextResponse.json({ error: "Could not create session" }, { status: 500 });

  return NextResponse.json({ verified: true, tokenHash, type: "magiclink" });
}
