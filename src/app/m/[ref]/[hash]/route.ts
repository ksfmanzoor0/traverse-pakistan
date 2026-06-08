import { NextRequest, NextResponse } from "next/server";

// Short magic-link redirect. Long ?token_hash= URLs in WhatsApp templates
// trip Meta's ecosystem-health filter (error 131049 — silent drop). This
// route accepts a compact /m/{ref}/{hash} URL and 302s to the real callback.
//
// Default next destination is /bookings/{ref}. The "view all my bookings"
// sign-in flow passes ref=me — there's no specific booking, so an explicit
// ?next=/mybookings query param overrides the default.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ref: string; hash: string }> }
) {
  const { ref, hash } = await params;
  const overrideNext = req.nextUrl.searchParams.get("next");
  const safeOverride = overrideNext && overrideNext.startsWith("/") && !overrideNext.startsWith("//") ? overrideNext : null;
  const next = encodeURIComponent(safeOverride ?? `/bookings/${ref}`);
  const target = `/auth/callback?token_hash=${hash}&type=magiclink&next=${next}`;
  return NextResponse.redirect(new URL(target, req.url), { status: 302 });
}
