"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

export type PackagePatch = {
  name?: string;
  description?: string;
  badge?: string | null;
  duration?: number;
  route?: string | null;
  destination_slug?: string;
  related_destination_slugs?: string[];
  region_slug?: string;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  know_before_you_go?: string[];
  max_group_size?: number | null;
  languages?: string[];
  published?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
};

export async function updatePackage(
  slug: string,
  patch: PackagePatch,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("packages")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateTag("packages", {});
  revalidatePath("/admin/packages");
  revalidatePath(`/admin/packages/${slug}`);
  revalidatePath(`/packages/${slug}`);
  revalidatePath("/packages");
  return { ok: true };
}

export async function deletePackage(slug: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("packages").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateTag("packages", {});
  revalidatePath("/admin/packages");
  revalidatePath("/packages");
  redirect("/admin/packages");
}
