"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { putR2Marker } from "@/lib/r2";
import type { AddonType } from "@/types/tour-addon";
import type { TourBlock } from "@/types/tour-block";

type PackageListItem = { text: string; cityOnly?: Array<"ISB" | "LHE" | "KHI" | "KDU"> };

export type TierPricing = {
  islamabad: number | null;
  lahore: number | null;
  karachi: number | null;
};

export type PackagePricing = {
  deluxe: TierPricing;
  luxury: TierPricing;
};

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
  inclusions?: PackageListItem[];
  exclusions?: PackageListItem[];
  know_before_you_go?: string[];
  body_blocks?: TourBlock[];
  images?: Array<{ url: string; alt: string }>;
  max_group_size?: number | null;
  languages?: string[];
  published?: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
  pricing?: PackagePricing | null;
  starting_cities?: string[];
  total_distance_km?: number | null;
  meals_per_person?: number;
  entries_per_person?: number;
  destination_rank?: Record<string, number>;
  child_discount_pct?: number | null;
  group_discount_tiers?: Array<{ minAdults: number; pct: number }> | null;
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

export type ItineraryStop = { name: string; detail: string };

export type ItineraryDayInput = {
  day_number: number;
  title: string;
  description: string;
  hotel_deluxe: string | null;
  hotel_luxury: string | null;
  stops: ItineraryStop[];
  driving_time: string | null;
  overnight: string | null;
  city_only: string[] | null;
};

export async function saveItinerary(
  packageSlug: string,
  days: ItineraryDayInput[],
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const cleaned = days
    .map((d, idx) => ({
      package_slug: packageSlug,
      day_number: idx + 1,
      title: (d.title ?? "").trim(),
      description: (d.description ?? "").trim(),
      hotel_deluxe: d.hotel_deluxe?.trim() || null,
      hotel_luxury: d.hotel_luxury?.trim() || null,
      stops: (d.stops ?? [])
        .map((s) => ({ name: (s.name ?? "").trim(), detail: (s.detail ?? "").trim() }))
        .filter((s) => s.name || s.detail),
      driving_time: d.driving_time?.trim() || null,
      overnight: d.overnight?.trim() || null,
      city_only: d.city_only && d.city_only.length > 0 ? d.city_only : null,
    }))
    .filter((d) => d.title || d.description || d.stops.length > 0);

  const { error: delErr } = await supabase
    .from("package_itinerary_days")
    .delete()
    .eq("package_slug", packageSlug);
  if (delErr) return { ok: false, error: delErr.message };

  if (cleaned.length > 0) {
    const { error: insErr } = await supabase
      .from("package_itinerary_days")
      .insert(cleaned as never);
    if (insErr) return { ok: false, error: insErr.message };
  }

  revalidateTag("packages", {});
  revalidatePath(`/admin/packages/${packageSlug}`);
  revalidatePath(`/admin/packages/${packageSlug}/itinerary`);
  revalidatePath(`/packages/${packageSlug}`);
  return { ok: true };
}

export async function provisionR2Folder(slug: string): Promise<{ ok: boolean; key?: string; error?: string }> {
  await requireAdmin();
  const cleanSlug = slug.trim();
  if (!cleanSlug) return { ok: false, error: "Slug required" };
  const key = `packages/${cleanSlug}/.keep`;
  const res = await putR2Marker(key);
  if (!res.ok) return { ok: false, error: res.error };
  return { ok: true, key };
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

/* ============================ Rename slug ============================ */

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function renamePackageSlug(oldSlug: string, newSlug: string): Promise<{ ok: boolean; slug?: string; error?: string }> {
  await requireAdmin();
  if (oldSlug === newSlug) return { ok: true, slug: oldSlug };
  if (!SLUG_RE.test(newSlug)) return { ok: false, error: "Slug must be lowercase kebab-case" };

  const supabase = getSupabaseAdmin();
  const [taken, source] = await Promise.all([
    supabase.from("packages").select("slug").eq("slug", newSlug).maybeSingle(),
    supabase.from("packages").select("slug").eq("slug", oldSlug).maybeSingle(),
  ]);
  if (taken.data) return { ok: false, error: `Slug "${newSlug}" is already taken` };
  if (!source.data) return { ok: false, error: `Package "${oldSlug}" not found` };

  // package_itinerary_days + package_addons ride ON UPDATE CASCADE
  // (migration 20260812_package_slug_fks_on_update_cascade). No sibling
  // tables reference package_slug as plain text.
  const t = await supabase
    .from("packages")
    .update({ slug: newSlug, updated_at: new Date().toISOString() })
    .eq("slug", oldSlug);
  if (t.error) return { ok: false, error: t.error.message };

  revalidateTag("packages", {});
  revalidatePath("/admin/packages");
  revalidatePath(`/admin/packages/${oldSlug}`);
  revalidatePath(`/admin/packages/${newSlug}`);
  revalidatePath(`/packages/${oldSlug}`);
  revalidatePath(`/packages/${newSlug}`);
  return { ok: true, slug: newSlug };
}

export async function renamePackageSlugAndRedirect(oldSlug: string, newSlug: string) {
  const r = await renamePackageSlug(oldSlug, newSlug);
  if (!r.ok || !r.slug) return r;
  redirect(`/admin/packages/${r.slug}`);
}

/* ============================ Package addons ============================ */

export type PackageAddonPatch = {
  id?: string;
  package_slug: string;
  type: AddonType;
  label: string;
  applies_to_departures: string[];
  group_key: string | null;
  is_required: boolean;
  default_selected: boolean;
  duration_delta: number;
  priority: number;
  config: Record<string, unknown>;
};

export async function upsertPackageAddon(addon: PackageAddonPatch): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const payload = {
    package_slug: addon.package_slug,
    type: addon.type,
    label: addon.label,
    applies_to_departures: addon.applies_to_departures,
    group_key: addon.group_key,
    is_required: addon.is_required,
    default_selected: addon.default_selected,
    duration_delta: addon.duration_delta,
    priority: addon.priority,
    config: addon.config,
    updated_at: new Date().toISOString(),
  };
  if (addon.id) {
    const { error } = await supabase.from("package_addons").update(payload).eq("id", addon.id);
    if (error) return { ok: false, error: error.message };
    revalidateTag("packages", {});
    revalidatePath(`/packages/${addon.package_slug}`);
    return { ok: true, id: addon.id };
  }
  const { data, error } = await supabase.from("package_addons").insert(payload).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidateTag("packages", {});
  revalidatePath(`/packages/${addon.package_slug}`);
  return { ok: true, id: (data as { id: string }).id };
}

export async function deletePackageAddon(id: string, packageSlug: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("package_addons").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateTag("packages", {});
  revalidatePath(`/packages/${packageSlug}`);
  return { ok: true };
}
