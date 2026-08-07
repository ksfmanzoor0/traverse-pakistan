import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface PromoCodeRow {
  id: string;
  code: string;
  user_id: string;
  discount_amount: number;
  used_at: string | null;
  used_on_booking_ref: string | null;
  created_at: string;
}

// Idempotent: calls the SQL mint_promo_code_for_user() RPC which returns the
// existing row if the user already has a code, or mints the next sequential
// "TraverseNN" for a new user. Never throws — a failure here should not
// break the calling flow (booking / account load).
export async function mintPromoCodeForUser(userId: string): Promise<PromoCodeRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("mint_promo_code_for_user" as never, { p_user_id: userId } as never);
  if (error) {
    console.error("[promo/mint] failed", userId, error);
    return null;
  }
  return (data as unknown as PromoCodeRow) ?? null;
}

export async function getPromoCodeForUser(userId: string): Promise<PromoCodeRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("promo_codes" as never)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as unknown as PromoCodeRow) ?? null;
}
