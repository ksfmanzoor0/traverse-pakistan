"use server";

import { revalidatePath } from "next/cache";
import { setInvitationLetterPricePkr, setInvitationSignatureDataUrl } from "@/lib/invitation/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { LetterData } from "@/lib/invitation/letterData";
import { sendInvitationLetterIssued } from "@/lib/email/sendInvitationLetterIssued";

export async function updateInvitationLetterPrice(formData: FormData): Promise<void> {
  const raw = formData.get("price_pkr");
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return;
  await setInvitationLetterPricePkr(n);
  revalidatePath("/admin/invitation-letters");
  revalidatePath("/invitation-letter");
}

export async function updateInvitationSignature(dataUrl: string | null): Promise<{ ok: boolean; error?: string }> {
  if (dataUrl !== null) {
    if (!dataUrl.startsWith("data:image/") || dataUrl.length > 2_500_000) {
      return { ok: false, error: "Invalid image (max ~1.8 MB PNG/JPG)" };
    }
  }
  await setInvitationSignatureDataUrl(dataUrl);
  revalidatePath("/admin/invitation-letters");
  return { ok: true };
}

export async function saveInvitationLetterData(ref: string, data: LetterData): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("invitation_requests" as never)
    .update({ letter_data: data, updated_at: new Date().toISOString() } as never)
    .eq("ref", ref);
  if (error) {
    console.error("[saveInvitationLetterData]", error);
    return { ok: false, error: error.message };
  }
  revalidatePath(`/admin/invitation-letters/${ref}`);
  return { ok: true };
}

export async function sendInvitationLetter(ref: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("invitation_requests" as never)
    .select("status, letter_data, contact_name, contact_email")
    .eq("ref", ref)
    .maybeSingle();
  if (error || !data) return { ok: false, error: "Request not found" };
  const row = data as { status: string; letter_data: LetterData | null; contact_name: string; contact_email: string };
  if (row.status !== "paid" && row.status !== "issued") return { ok: false, error: "Not paid yet" };
  if (!row.letter_data) return { ok: false, error: "Save the letter draft first" };

  try {
    await sendInvitationLetterIssued({
      ref,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      letterData: row.letter_data,
    });
  } catch (e) {
    console.error("[sendInvitationLetter] email failed:", e);
    return { ok: false, error: "Failed to send email" };
  }

  await supabase
    .from("invitation_requests" as never)
    .update({ status: "issued", issued_at: new Date().toISOString(), updated_at: new Date().toISOString() } as never)
    .eq("ref", ref);

  revalidatePath(`/admin/invitation-letters/${ref}`);
  return { ok: true };
}
