import { getSupabaseAdmin } from "@/lib/supabase/server";

export const INVITATION_LETTER_PRICE_USD = 50;
export const INVITATION_LETTER_PRICE_FALLBACK_PKR = 14000;
export const INVITATION_LETTER_PRICE_SETTING_KEY = "invitation_letter_price_pkr";

export async function getInvitationLetterPricePkr(): Promise<number> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("app_settings" as never)
      .select("value")
      .eq("key", INVITATION_LETTER_PRICE_SETTING_KEY)
      .maybeSingle();
    const raw = (data as { value: unknown } | null)?.value;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n) || n <= 0) return INVITATION_LETTER_PRICE_FALLBACK_PKR;
    return n;
  } catch {
    return INVITATION_LETTER_PRICE_FALLBACK_PKR;
  }
}

export async function setInvitationLetterPricePkr(value: number): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("app_settings" as never)
    .upsert({
      key: INVITATION_LETTER_PRICE_SETTING_KEY,
      value,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "key" });
}

export function generateInvitationRef(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${rand}`;
}
