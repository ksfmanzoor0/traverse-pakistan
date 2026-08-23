"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import type { TermsContent } from "@/lib/supabase/types";

export async function updateTerms(
  next: TermsContent,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  // Trim empty strings from arrays; validate structure lightly.
  const codeOfConduct = next.codeOfConduct.map((s) => s.trim()).filter(Boolean);
  const normalize = (rows: { days: string; charge: string }[]) =>
    rows
      .map((r) => ({ days: r.days.trim(), charge: r.charge.trim() }))
      .filter((r) => r.days || r.charge);

  const payload: TermsContent = {
    intro: next.intro.trim(),
    codeOfConduct,
    cancellation: {
      group: normalize(next.cancellation.group),
      private: normalize(next.cancellation.private),
      transport: normalize(next.cancellation.transport),
      hotelsAirlinesNote: next.cancellation.hotelsAirlinesNote.trim(),
    },
    flightCancellation: next.flightCancellation.trim(),
    refund: next.refund.trim(),
  };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "terms", value: payload }, { onConflict: "key" });

  if (error) return { ok: false, error: error.message };

  revalidateTag("terms", {});
  revalidatePath("/terms");
  revalidatePath("/admin/terms");
  return { ok: true };
}
