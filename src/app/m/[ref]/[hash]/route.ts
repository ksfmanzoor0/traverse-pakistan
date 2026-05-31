import { NextRequest, NextResponse } from "next/server";

// Short magic-link redirect. Long ?token_hash= URLs in WhatsApp templates
// trip Meta's ecosystem-health filter (error 131049 — silent drop). This
// route accepts a compact /m/{ref}/{hash} URL and 302s to the real callback.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ref: string; hash: string }> }
) {
  const { ref, hash } = await params;
  const next = encodeURIComponent(`/bookings/${ref}`);
  const target = `/auth/callback?token_hash=${hash}&type=magiclink&next=${next}`;
  return NextResponse.redirect(new URL(target, _req.url), { status: 302 });
}
