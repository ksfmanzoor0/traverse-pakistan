"use server";

import { revalidatePath } from "next/cache";
import { setInvitationLetterPricePkr } from "@/lib/invitation/config";

export async function updateInvitationLetterPrice(formData: FormData): Promise<void> {
  const raw = formData.get("price_pkr");
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return;
  await setInvitationLetterPricePkr(n);
  revalidatePath("/admin/invitation-letters");
  revalidatePath("/invitation-letter");
}
