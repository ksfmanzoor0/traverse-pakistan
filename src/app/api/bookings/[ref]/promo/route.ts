import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import type { PromoCodeRow } from "@/lib/promo/mint";

/**
 * POST /api/bookings/[ref]/promo — attach a validated promo code to a newly
 * created package booking. Called by the wizard immediately after
 * createPackageBooking() succeeds so IPN-side consumption can find the code.
 *
 * The code is NOT consumed here — used_at is only set by markBooking on
 * successful payment. Unpaid bookings leave the code available.
 */
export async function POST(req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const supabase = await getSupabaseServer();
  const { data: sess } = await supabase.auth.getUser();
  const user = sess?.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "Sign-in required" }, { status: 401 });
  }

  let code: string | undefined;
  try {
    const body = (await req.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code.trim() : undefined;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

  const admin = getSupabaseAdmin();
  const { data: promo } = await admin
    .from("promo_codes" as never)
    .select("*")
    .ilike("code", code)
    .maybeSingle();
  const promoRow = promo as unknown as PromoCodeRow | null;

  if (!promoRow || promoRow.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "Code not linked to your account" }, { status: 403 });
  }
  if (promoRow.used_at) {
    return NextResponse.json({ ok: false, error: "Code already used" }, { status: 409 });
  }

  // Only allow attaching to a booking owned by this user
  const { data: booking } = await admin
    .from("package_bookings")
    .select("booking_ref, user_id, promo_code")
    .eq("booking_ref", ref)
    .maybeSingle();
  const bookingRow = booking as { booking_ref: string; user_id: string | null; promo_code: string | null } | null;
  if (!bookingRow) return NextResponse.json({ ok: false, error: "Booking not found" }, { status: 404 });
  if (bookingRow.user_id && bookingRow.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "Not your booking" }, { status: 403 });
  }
  if (bookingRow.promo_code) {
    return NextResponse.json({ ok: false, error: "Promo already attached" }, { status: 409 });
  }

  await admin
    .from("package_bookings")
    .update({ promo_code: promoRow.code, promo_discount_amount: promoRow.discount_amount } as never)
    .eq("booking_ref", ref);

  return NextResponse.json({ ok: true, code: promoRow.code, discount: promoRow.discount_amount });
}
