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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type NewPackageInput = {
  slug: string;
  name: string;
  duration: number;
  destination_slug: string;
  region_slug: string;
};

export async function createPackage(input: NewPackageInput): Promise<{ ok: boolean; slug?: string; error?: string }> {
  await requireAdmin();
  const cleanSlug = slugify(input.slug);
  if (!cleanSlug) return { ok: false, error: "Slug is required" };
  if (!input.name.trim()) return { ok: false, error: "Name is required" };
  if (!input.destination_slug) return { ok: false, error: "Destination is required" };
  if (!input.region_slug) return { ok: false, error: "Region is required" };
  const duration = Math.max(1, Math.floor(Number(input.duration) || 0));
  if (duration < 1) return { ok: false, error: "Duration must be at least 1" };

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("packages").select("slug").eq("slug", cleanSlug).maybeSingle();
  if (existing) return { ok: false, error: `Slug "${cleanSlug}" is already taken` };

  const { error } = await supabase.from("packages").insert({
    slug: cleanSlug,
    name: input.name.trim(),
    duration,
    destination_slug: input.destination_slug,
    region_slug: input.region_slug,
    published: false,
  } as never);
  if (error) return { ok: false, error: error.message };

  revalidateTag("packages", {});
  revalidatePath("/admin/packages");
  return { ok: true, slug: cleanSlug };
}

export async function duplicatePackage(
  sourceSlug: string,
  newSlug: string,
): Promise<{ ok: boolean; slug?: string; error?: string }> {
  await requireAdmin();
  const cleanSlug = slugify(newSlug);
  if (!cleanSlug) return { ok: false, error: "New slug is required" };
  if (cleanSlug === sourceSlug) return { ok: false, error: "New slug must differ from the source" };

  const supabase = getSupabaseAdmin();
  const { data: src, error: readErr } = await supabase.from("packages").select("*").eq("slug", sourceSlug).maybeSingle();
  if (readErr || !src) return { ok: false, error: "Source package not found" };

  const { data: clash } = await supabase.from("packages").select("slug").eq("slug", cleanSlug).maybeSingle();
  if (clash) return { ok: false, error: `Slug "${cleanSlug}" is already taken` };

  const source = src as Record<string, unknown>;
  const copy: Record<string, unknown> = { ...source };
  delete copy.id;
  delete copy.created_at;
  delete copy.updated_at;
  copy.slug = cleanSlug;
  copy.name = `${source.name as string} (Copy)`;
  copy.published = false;

  const { error: insErr } = await supabase.from("packages").insert(copy as never);
  if (insErr) return { ok: false, error: insErr.message };

  const { data: days } = await supabase
    .from("package_itinerary_days")
    .select("*")
    .eq("package_slug", sourceSlug);
  if (days && Array.isArray(days) && days.length > 0) {
    const dayCopies = (days as Array<Record<string, unknown>>).map((d) => {
      const c: Record<string, unknown> = { ...d };
      delete c.id;
      c.package_slug = cleanSlug;
      return c;
    });
    const { error: daysErr } = await supabase.from("package_itinerary_days").insert(dayCopies as never);
    if (daysErr) return { ok: false, error: `Package copied but itinerary insert failed: ${daysErr.message}` };
  }

  revalidateTag("packages", {});
  revalidatePath("/admin/packages");
  return { ok: true, slug: cleanSlug };
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
