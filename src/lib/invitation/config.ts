import { getSupabaseAdmin } from "@/lib/supabase/server";

export const INVITATION_LETTER_PRICE_USD = 50;
export const INVITATION_LETTER_PRICE_FALLBACK_PKR = 14000;
export const INVITATION_LETTER_PRICE_SETTING_KEY = "invitation_letter_price_pkr";
export const INVITATION_LETTER_SIGNATURE_SETTING_KEY = "invitation_letter_signature_data_url";

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

export const INVITATION_LETTER_SIGNATURES_SETTING_KEY = "invitation_letter_signatures";

export type SignatureSlot = { label: string | null; dataUrl: string | null };

// Every letter has exactly 3 signatory slots. Empty slots stay in the array so
// slot indices are stable — admins can leave a slot blank without shifting the
// slot numbers for existing letters that reference them.
export const SIGNATURE_SLOT_COUNT = 3;

function emptySlots(): SignatureSlot[] {
  return Array.from({ length: SIGNATURE_SLOT_COUNT }, () => ({ label: null, dataUrl: null }));
}

function coerceSlots(raw: unknown): SignatureSlot[] {
  const out = emptySlots();
  if (!Array.isArray(raw)) return out;
  for (let i = 0; i < SIGNATURE_SLOT_COUNT; i += 1) {
    const item = raw[i];
    if (item && typeof item === "object") {
      const label = "label" in item && typeof (item as { label: unknown }).label === "string"
        ? (item as { label: string }).label
        : null;
      const dataUrl = "dataUrl" in item && typeof (item as { dataUrl: unknown }).dataUrl === "string" && (item as { dataUrl: string }).dataUrl.startsWith("data:image/")
        ? (item as { dataUrl: string }).dataUrl
        : null;
      out[i] = { label, dataUrl };
    }
  }
  return out;
}

export async function getInvitationSignatures(): Promise<SignatureSlot[]> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("app_settings" as never)
      .select("value")
      .eq("key", INVITATION_LETTER_SIGNATURES_SETTING_KEY)
      .maybeSingle();
    const raw = (data as { value: unknown } | null)?.value;
    if (raw != null) return coerceSlots(raw);
    // First-run migration: if only the legacy single-signature key exists,
    // adopt it as slot 0 so admins keep their upload without any manual step.
    const legacy = await getInvitationSignatureDataUrl();
    if (legacy) {
      const seeded = emptySlots();
      seeded[0] = { label: null, dataUrl: legacy };
      return seeded;
    }
    return emptySlots();
  } catch {
    return emptySlots();
  }
}

export async function setInvitationSignatures(slots: SignatureSlot[]): Promise<void> {
  const supabase = getSupabaseAdmin();
  const normalised = coerceSlots(slots);
  await supabase
    .from("app_settings" as never)
    .upsert({
      key: INVITATION_LETTER_SIGNATURES_SETTING_KEY,
      value: normalised,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "key" });
}

export async function getInvitationSignatureDataUrl(): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("app_settings" as never)
      .select("value")
      .eq("key", INVITATION_LETTER_SIGNATURE_SETTING_KEY)
      .maybeSingle();
    const raw = (data as { value: unknown } | null)?.value;
    return typeof raw === "string" && raw.startsWith("data:image/") ? raw : null;
  } catch {
    return null;
  }
}

export async function setInvitationSignatureDataUrl(dataUrl: string | null): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("app_settings" as never)
    .upsert({
      key: INVITATION_LETTER_SIGNATURE_SETTING_KEY,
      value: dataUrl,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "key" });
}

export function generateInvitationRef(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${rand}`;
}
