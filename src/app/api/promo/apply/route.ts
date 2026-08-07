import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import type { PromoCodeRow } from "@/lib/promo/mint";

/**
 * POST /api/promo/apply — validates a user-owned promo code and returns
 * the discount amount to apply. Self-use only: the code must belong to the
 * authenticated user (server-verified via cookie session) and be unused.
 *
 * Body: { code: string }
 * Response: { ok: true, discount: number, code: string } | { ok: false, error: string }
 */
export async function POST(req: Request) {
  const supabase = await getSupabaseServer();
  const { data: session } = await supabase.auth.getUser();
  const user = session?.user;
  if (!user) {
    return NextResponse.json({ ok: false, error: "Please sign in to apply your promo code." }, { status: 401 });
  }

  let code: string | undefined;
  try {
    const body = (await req.json()) as { code?: unknown };
    code = typeof body.code === "string" ? body.code.trim() : undefined;
  } catch {
    return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json({ ok: false, error: "Enter a code" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("promo_codes" as never)
    .select("*")
    .ilike("code", code)
    .maybeSingle();
  const row = data as unknown as PromoCodeRow | null;

  if (!row) {
    return NextResponse.json({ ok: false, error: "Code not recognised" }, { status: 404 });
  }
  if (row.user_id !== user.id) {
    // Deliberately vague so a bad actor can't enumerate other users' codes
    return NextResponse.json({ ok: false, error: "This code is not linked to your account" }, { status: 403 });
  }
  if (row.used_at) {
    return NextResponse.json({ ok: false, error: "This code has already been used" }, { status: 409 });
  }

  return NextResponse.json({ ok: true, discount: row.discount_amount, code: row.code });
}
