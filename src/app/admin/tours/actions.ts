"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import type { AddonType } from "@/types/tour-addon";
import type { TourBlock } from "@/types/tour-block";

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
  images?: Array<{ url: string; alt: string }>;
  body_blocks?: TourBlock[];
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

/* ============================ Create / Duplicate / Delete ============================ */

export type NewTourInput = {
  slug: string;
  name: string;
  category: string;
  duration: number;
  destination_slug: string;
  region_slug: string;
};

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Minimal sensible defaults so the row satisfies NOT NULL constraints. Every
// text field starts empty so the admin fills them in the editor.
const DEFAULT_MEETING_POINT = {
  address: "",
  departureTime: "",
  arrivalInstruction: "",
  endPoint: "",
  mapEmbedUrl: "",
  pickupOffered: false,
  pickupDescription: "",
};

export async function createTour(input: NewTourInput): Promise<{ ok: boolean; slug?: string; error?: string }> {
  await requireAdmin();
  if (!SLUG_RE.test(input.slug)) return { ok: false, error: "Slug must be lowercase kebab-case (a-z, 0-9, dashes)" };

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("tours").select("slug").eq("slug", input.slug).maybeSingle();
  if (existing) return { ok: false, error: `Slug "${input.slug}" is already taken` };

  const row = {
    slug: input.slug,
    name: input.name,
    description: "",
    category: input.category,
    badge: null,
    duration: input.duration,
    route: "",
    departure_date: null,
    destination_slug: input.destination_slug,
    region_slug: input.region_slug,
    travel_style_slugs: [] as string[],
    rating: 5.0,
    review_count: 0,
    max_group_size: 12,
    min_age: null,
    languages: ["English"],
    free_cancellation: true,
    reserve_now_pay_later: true,
    images: [] as Array<{ url: string; alt: string }>,
    guide: null,
    highlights: [] as string[],
    inclusions: [] as Array<{ text: string; cityOnly?: Array<"ISB" | "LHE" | "KHI" | "KDU"> }>,
    exclusions: [] as Array<{ text: string; cityOnly?: Array<"ISB" | "LHE" | "KHI" | "KDU"> }>,
    know_before_you_go: [] as string[],
    meeting_point: DEFAULT_MEETING_POINT,
    featured: false,
    anchor_city: "ISB" as const,
    meta_title: "",
    meta_description: "",
    related_destination_slugs: [] as string[],
    body_blocks: [] as TourBlock[],
  };
  const { error } = await supabase.from("tours").insert(row);
  if (error) return { ok: false, error: error.message };
  revalidateTag("tours", {});
  revalidatePath("/admin/tours");
  return { ok: true, slug: input.slug };
}

export async function duplicateTour(sourceSlug: string, newSlug: string, newName: string): Promise<{ ok: boolean; slug?: string; error?: string }> {
  await requireAdmin();
  if (!SLUG_RE.test(newSlug)) return { ok: false, error: "Slug must be lowercase kebab-case" };

  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("tours").select("slug").eq("slug", newSlug).maybeSingle();
  if (existing) return { ok: false, error: `Slug "${newSlug}" is already taken` };

  const { data: src, error: srcErr } = await supabase.from("tours").select("*").eq("slug", sourceSlug).maybeSingle();
  if (srcErr || !src) return { ok: false, error: "Source tour not found" };

  const source = src as Record<string, unknown>;
  const { id: _id, created_at: _c, updated_at: _u, slug: _s, name: _n, ...rest } = source;
  const insertRow = { ...rest, slug: newSlug, name: newName };
  // Row shape was validated at fetch time; we only substitute slug + name.
  const { error: tourErr } = await supabase.from("tours").insert(insertRow as never);
  if (tourErr) return { ok: false, error: tourErr.message };

  // Deep-copy itinerary days
  const { data: days } = await supabase.from("tour_itinerary_days").select("*").eq("tour_slug", sourceSlug);
  if (days && days.length > 0) {
    const dayRows = (days as Array<Record<string, unknown>>).map((d) => {
      const { id: _did, ...rest } = d;
      return { ...rest, tour_slug: newSlug };
    });
    const { error: dErr } = await supabase.from("tour_itinerary_days").insert(dayRows as never);
    if (dErr) return { ok: false, error: `Copied tour but itinerary failed: ${dErr.message}` };
  }

  // Deep-copy addons
  const { data: addons } = await supabase.from("tour_addons").select("*").eq("tour_slug", sourceSlug);
  if (addons && addons.length > 0) {
    const addonRows = (addons as Array<Record<string, unknown>>).map((a) => {
      const { id: _aid, created_at: _c, updated_at: _u, ...rest } = a;
      return { ...rest, tour_slug: newSlug };
    });
    const { error: aErr } = await supabase.from("tour_addons").insert(addonRows as never);
    if (aErr) return { ok: false, error: `Copied tour but addons failed: ${aErr.message}` };
  }

  revalidateTag("tours", {});
  revalidatePath("/admin/tours");
  return { ok: true, slug: newSlug };
}

export async function renameTourSlug(oldSlug: string, newSlug: string): Promise<{ ok: boolean; slug?: string; error?: string }> {
  await requireAdmin();
  if (oldSlug === newSlug) return { ok: true, slug: oldSlug };
  if (!SLUG_RE.test(newSlug)) return { ok: false, error: "Slug must be lowercase kebab-case" };

  const supabase = getSupabaseAdmin();

  // Guard: destination slug free + source exists.
  const [taken, source] = await Promise.all([
    supabase.from("tours").select("slug").eq("slug", newSlug).maybeSingle(),
    supabase.from("tours").select("slug").eq("slug", oldSlug).maybeSingle(),
  ]);
  if (taken.data) return { ok: false, error: `Slug "${newSlug}" is already taken` };
  if (!source.data) return { ok: false, error: `Tour "${oldSlug}" not found` };

  // Update child tables that don't have FK cascades first. `departures` and
  // `reviews` both reference tour_slug as plain text without a foreign key,
  // so we rewrite them before touching tours.slug. tour_itinerary_days and
  // tour_addons ride the ON UPDATE CASCADE we added in migration
  // 20260812_tour_slug_fks_on_update_cascade.
  const dep = await supabase.from("departures").update({ tour_slug: newSlug }).eq("tour_slug", oldSlug);
  if (dep.error) return { ok: false, error: `departures: ${dep.error.message}` };
  const rev = await supabase.from("reviews").update({ tour_slug: newSlug }).eq("tour_slug", oldSlug);
  if (rev.error) return { ok: false, error: `reviews: ${rev.error.message}` };

  // Finally: the tours row itself. Cascade fires on days + addons.
  const t = await supabase.from("tours").update({ slug: newSlug, updated_at: new Date().toISOString() }).eq("slug", oldSlug);
  if (t.error) return { ok: false, error: t.error.message };

  revalidateTag("tours", {});
  revalidatePath("/admin/tours");
  revalidatePath(`/admin/tours/${oldSlug}`);
  revalidatePath(`/admin/tours/${newSlug}`);
  revalidatePath(`/grouptours/${oldSlug}`);
  revalidatePath(`/grouptours/${newSlug}`);
  return { ok: true, slug: newSlug };
}

// Redirect wrapper — form action, lands on the renamed editor URL.
export async function renameTourSlugAndRedirect(oldSlug: string, newSlug: string) {
  const r = await renameTourSlug(oldSlug, newSlug);
  if (!r.ok || !r.slug) return r;
  redirect(`/admin/tours/${r.slug}`);
}

export async function deleteTour(slug: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  // Refuse if departures still exist — those may carry bookings + payment
  // history that must not be silently erased. Admin removes them from
  // /admin/departures first.
  const { count } = await supabase
    .from("departures")
    .select("id", { count: "exact", head: true })
    .eq("tour_slug", slug);
  if ((count ?? 0) > 0) {
    return { ok: false, error: `Tour has ${count} departure(s). Delete them from /admin/departures first.` };
  }
  // FK cascades handle itinerary_days + addons.
  const { error } = await supabase.from("tours").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateTag("tours", {});
  revalidatePath("/admin/tours");
  revalidatePath(`/grouptours/${slug}`);
  return { ok: true };
}

// Redirect wrapper so the form action lands on the new editor.
export async function createTourAndRedirect(input: NewTourInput) {
  const r = await createTour(input);
  if (!r.ok || !r.slug) return r;
  redirect(`/admin/tours/${r.slug}`);
}

/* ============================ Departures ============================ */

export type DeparturePatch = {
  id?: string;
  tour_slug: string;
  departure_date: string;
  end_date: string | null;
  max_seats: number;
  price: number;
  single_supplement: number | null;
  status: "open" | "closed" | "cancelled";
};

export async function upsertDeparture(row: DeparturePatch): Promise<{ ok: boolean; id?: string; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const payload = {
    tour_slug: row.tour_slug,
    departure_date: row.departure_date,
    end_date: row.end_date,
    max_seats: row.max_seats,
    price: row.price,
    single_supplement: row.single_supplement,
    status: row.status,
    // All new tour departures use the NULL-city model — per-city variance is
    // handled through tour_addons, not per-departure rows.
    departure_city: null,
  };
  if (row.id) {
    const { error } = await supabase.from("departures").update(payload).eq("id", row.id);
    if (error) return { ok: false, error: error.message };
    bust(row.tour_slug);
    return { ok: true, id: row.id };
  }
  const { data, error } = await supabase.from("departures").insert(payload).select("id").single();
  if (error) return { ok: false, error: error.message };
  bust(row.tour_slug);
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteDeparture(id: string, tourSlug: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  // Guard: if any bookings reference this departure, refuse. Bookings ledger
  // is the source of truth for payments; silently dropping a departure would
  // orphan them.
  const { count } = await supabase
    .from("bookings")
    .select("id", { count: "exact", head: true })
    .eq("departure_id", id);
  if ((count ?? 0) > 0) {
    return { ok: false, error: `Departure has ${count} booking(s). Cancel it instead of deleting.` };
  }
  const { error } = await supabase.from("departures").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  bust(tourSlug);
  return { ok: true };
}
