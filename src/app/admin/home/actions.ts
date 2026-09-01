"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

type Payload = Record<string, { featured: boolean; rank: number | null }>;
type Result = { ok: boolean; error?: string };

export async function saveHomeFeaturedTours(payload: Payload): Promise<Result> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  for (const [slug, patch] of Object.entries(payload)) {
    const { error } = await supabase
      .from("tours")
      .update({ featured: patch.featured, featured_rank: patch.rank, updated_at: now })
      .eq("slug", slug);
    if (error) return { ok: false, error: `${slug}: ${error.message}` };
  }
  revalidateTag("tours", {});
  revalidatePath("/admin/home");
  revalidatePath("/admin/tours");
  revalidatePath("/");
  return { ok: true };
}

export async function saveHomeFeaturedPackages(payload: Payload): Promise<Result> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  for (const [slug, patch] of Object.entries(payload)) {
    const { error } = await supabase
      .from("packages")
      .update({ featured: patch.featured, featured_rank: patch.rank, updated_at: now })
      .eq("slug", slug);
    if (error) return { ok: false, error: `${slug}: ${error.message}` };
  }
  revalidateTag("packages", {});
  revalidatePath("/admin/home");
  revalidatePath("/admin/packages");
  revalidatePath("/");
  return { ok: true };
}

export async function saveHomeDestinations(payload: Payload): Promise<Result> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  for (const [slug, patch] of Object.entries(payload)) {
    const { error } = await supabase
      .from("destinations")
      .update({ home_rank: patch.rank, updated_at: now })
      .eq("slug", slug);
    if (error) return { ok: false, error: `${slug}: ${error.message}` };
  }
  revalidateTag("destinations", {});
  revalidatePath("/admin/home");
  revalidatePath("/");
  return { ok: true };
}
