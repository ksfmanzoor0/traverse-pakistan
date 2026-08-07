import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { mintPromoCodeForUser } from "@/lib/promo/mint";

/**
 * GET /api/promo/me — returns the authenticated user's promo code, minting
 * lazily if they don't have one yet. Used by client teasers on package
 * detail / booking bar.
 *
 * 401 for logged-out — the client component treats that as "logged out" and
 * shows a sign-in nudge instead.
 */
export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: sess } = await supabase.auth.getUser();
  const user = sess?.user;
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const promo = await mintPromoCodeForUser(user.id);
  if (!promo) return NextResponse.json({ error: "mint failed" }, { status: 500 });

  return NextResponse.json({
    code: promo.code,
    discount_amount: promo.discount_amount,
    used_at: promo.used_at,
    used_on_booking_ref: promo.used_on_booking_ref,
  });
}
