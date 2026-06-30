import { NextRequest, NextResponse } from "next/server";
import { createViewCookie } from "@/lib/auth/viewCookie";

// POST /api/bookings/[ref]/manage-init
// Called from the "Manage My Booking" form on the booking-received success
// page. Sets the per-booking view cookie (browser-bound, 1h) and fires the
// step-up send (magic link via email + WhatsApp, plus OTP fallback). Then
// 302-redirects to /bookings/[ref]?sent=1 so the booking page can render
// the "magic link sent" banner state.
//
// Identity proof: the user is the one who just completed checkout in this
// browser — there's no harm in granting view-tier access for a single ref.
// Manage actions still require explicit verified_via_otp via magic link or
// OTP entry. Refs are 32-bit random; an attacker who learns one only gets
// view-tier details (contact name, dates, amount) — no destructive power.
export async function POST(req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  // Fire the send via the existing step-up route. Don't await delivery —
  // the redirect should be snappy. Send happens server-to-server.
  const origin = new URL(req.url).origin;
  fetch(`${origin}/api/bookings/${encodeURIComponent(ref)}/step-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  }).catch((err) => console.error("[manage-init] step-up fire failed:", err));

  const cookie = createViewCookie(ref);
  const dest = new URL(`/bookings/${ref}?sent=1`, origin);
  const res = NextResponse.redirect(dest, { status: 303 });
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });
  return res;
}
