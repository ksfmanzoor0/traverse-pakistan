"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import type { AddonType } from "@/types/tour-addon";

type TourListItem = { text: string; cityOnly?: Array<"ISB" | "LHE" | "KHI" | "KDU"> };

export type TourPatch = {
  name?: string;
  description?: string;
  badge?: string | null;
  duration?: number;
  route?: string;
  destination_slug?: string;
  region_slug?: string;
  category?: string;
  highlights?: string[];
  inclusions?: TourListItem[];
  exclusions?: TourListItem[];
  know_before_you_go?: string[];
  meeting_point?: {
    address: string;
    departureTime: string;
    arrivalInstruction: string;
    endPoint: string;
    mapEmbedUrl: string;
    pickupOffered: boolean;
    pickupDescription: string;
  };
  max_group_size?: number;
  min_age?: number | null;
  anchor_city?: "ISB" | "LHE" | "KHI" | "KDU" | null;
  languages?: string[];
  meta_title?: string;
  meta_description?: string;
  featured?: boolean;
};

function bust(slug: string) {
  revalidateTag("tours", {});
  revalidatePath("/admin/tours");
  revalidatePath(`/admin/tours/${slug}`);
  revalidatePath(`/grouptours/${slug}`);
}

export async function updateTour(slug: string, patch: TourPatch): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("tours")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  bust(slug);
  return { ok: true };
}

export type ItineraryDayPatch = {
  id?: string;
  tour_slug: string;
  day_number: number;
  title: string;
  description: string;
  image: { url: string; alt: string } | null;
  stops: Array<{ name: string; detail: string; cityOnly?: string }>;
  driving_time: string;
  overnight: string;
  city_only: string[] | null;
};

export async function upsertItineraryDay(day: ItineraryDayPatch): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const payload = {
    tour_slug: day.tour_slug,
    day_number: day.day_number,
    title: day.title,
    description: day.description,
    image: day.image,
    stops: day.stops,
    driving_time: day.driving_time,
    overnight: day.overnight,
    city_only: day.city_only,
  };
  if (day.id) {
    const { error } = await supabase.from("tour_itinerary_days").update(payload).eq("id", day.id);
    if (error) return { ok: false, error: error.message };
    bust(day.tour_slug);
    return { ok: true, id: day.id };
  }
  const { data, error } = await supabase.from("tour_itinerary_days").insert(payload).select("id").single();
  if (error) return { ok: false, error: error.message };
  bust(day.tour_slug);
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteItineraryDay(id: string, tourSlug: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("tour_itinerary_days").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  bust(tourSlug);
  return { ok: true };
}

export type TourAddonPatch = {
  id?: string;
  tour_slug: string;
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

export async function upsertTourAddon(addon: TourAddonPatch): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const payload = {
    tour_slug: addon.tour_slug,
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
    const { error } = await supabase.from("tour_addons").update(payload).eq("id", addon.id);
    if (error) return { ok: false, error: error.message };
    bust(addon.tour_slug);
    return { ok: true, id: addon.id };
  }
  const { data, error } = await supabase.from("tour_addons").insert(payload).select("id").single();
  if (error) return { ok: false, error: error.message };
  bust(addon.tour_slug);
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteTourAddon(id: string, tourSlug: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("tour_addons").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  bust(tourSlug);
  return { ok: true };
}
