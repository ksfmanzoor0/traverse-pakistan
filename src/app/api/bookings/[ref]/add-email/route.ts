import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireBookingViewer } from "@/lib/auth/requireBookingViewer";
import { isSynthesizedEmail } from "@/lib/auth/phone";

const schema = z.object({
  email: z.string().email().max(120),
});

// POST /api/bookings/[ref]/add-email
// Allows a phone-only booker to attach a real email to their auth user.
// Gated by:
//   - requireBookingViewer (the requester must already have view-tier access
//     via cookie or session, meaning they proved ref+contact match)
//   - the booking's auth user must currently have a synthesized
//     @traverse.internal email (we don't let people change real emails — that
//     would be an account-takeover hole; account/email change belongs in a
//     separate, OTP-gated flow)
//   - the requested email must not already belong to another auth.users row
//
// On success, the auth user's email is updated and email_confirm=true is set
// so future magic-link sends can deliver to it. The client should then
// trigger the standard step-up POST to send the link.
export async function POST(req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  const guard = await requireBookingViewer(ref);
  if (!guard.ok) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const body = schema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  const email = body.data.email.trim().toLowerCase();

  if (!guard.bookingUserId) {
    return NextResponse.json({ error: "Booking has no associated user." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Confirm current email is synthesized; refuse to replace a real email here.
  const { data: userResult, error: getErr } = await admin.auth.admin.getUserById(guard.bookingUserId);
  if (getErr || !userResult?.user) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }
  const currentEmail = userResult.user.email ?? "";
  if (!isSynthesizedEmail(currentEmail)) {
    return NextResponse.json({ error: "An email is already on file for this account." }, { status: 409 });
  }

  // Check the requested email isn't already in use by another auth user.
  const { data: existingId } = await admin.rpc("find_auth_user_by_contact", {
    p_email: email,
    p_phone: null,
  });
  if (existingId && existingId !== guard.bookingUserId) {
    return NextResponse.json({ error: "That email is already linked to another account." }, { status: 409 });
  }

  // Update the auth user's email; mark it confirmed since the client will be
  // verifying via the magic link we send next.
  const { error: updateErr } = await admin.auth.admin.updateUserById(guard.bookingUserId, {
    email,
    email_confirm: true,
  });
  if (updateErr) {
    console.error("[add-email] updateUserById failed:", updateErr);
    return NextResponse.json({ error: "Could not update email. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
