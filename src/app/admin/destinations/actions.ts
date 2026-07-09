"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type Entry = { rank?: number; hidden?: boolean; featured?: boolean };
type PerPackagePayload = { entry: Entry; published: boolean };

function normalizeEntry(entry: Entry): Entry | null {
  const e: Entry = {};
  if (typeof entry.rank === "number" && Number.isFinite(entry.rank)) e.rank = entry.rank;
  if (entry.hidden === true) e.hidden = true;
  if (entry.featured === true) e.featured = true;
  return Object.keys(e).length ? e : null;
}

export async function saveDestinationPackageOverrides(
  destinationSlug: string,
  payload: Record<string, PerPackagePayload>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const packageSlugs = Object.keys(payload);
  if (packageSlugs.length === 0) return { ok: true };

  const { data: rows, error: readErr } = await supabase
    .from("packages")
    .select("slug, destination_rank")
    .in("slug", packageSlugs);
  if (readErr) return { ok: false, error: readErr.message };

  for (const row of (rows as Array<{ slug: string; destination_rank: Record<string, unknown> | null }>)) {
    const current = { ...(row.destination_rank ?? {}) };
    const p = payload[row.slug];
    const normalized = normalizeEntry(p.entry);
    if (normalized === null) delete current[destinationSlug];
    else current[destinationSlug] = normalized;

    const { error } = await supabase
      .from("packages")
      .update({ destination_rank: current as never, published: p.published })
      .eq("slug", row.slug);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/destinations/${destinationSlug}`);
  revalidatePath(`/admin/destinations/${destinationSlug}`);
  revalidatePath("/packages");
  return { ok: true };
}
