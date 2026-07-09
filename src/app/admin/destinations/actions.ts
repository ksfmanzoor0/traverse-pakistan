"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type Entry = { rank?: number; hidden?: boolean; featured?: boolean };

function normalizeEntry(entry: Entry): Entry | null {
  const e: Entry = {};
  if (typeof entry.rank === "number" && Number.isFinite(entry.rank)) e.rank = entry.rank;
  if (entry.hidden === true) e.hidden = true;
  if (entry.featured === true) e.featured = true;
  return Object.keys(e).length ? e : null;
}

export async function saveDestinationPackageOverrides(
  destinationSlug: string,
  entries: Record<string, Entry>,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = getSupabaseAdmin();
  const packageSlugs = Object.keys(entries);
  if (packageSlugs.length === 0) return { ok: true };

  const { data: rows, error: readErr } = await supabase
    .from("packages")
    .select("slug, destination_rank")
    .in("slug", packageSlugs);
  if (readErr) return { ok: false, error: readErr.message };

  const updates: Array<{ slug: string; destination_rank: Record<string, unknown> }> = [];
  for (const row of (rows as Array<{ slug: string; destination_rank: Record<string, unknown> | null }>)) {
    const current = { ...(row.destination_rank ?? {}) };
    const normalized = normalizeEntry(entries[row.slug]);
    if (normalized === null) {
      delete current[destinationSlug];
    } else {
      current[destinationSlug] = normalized;
    }
    updates.push({ slug: row.slug, destination_rank: current });
  }

  for (const u of updates) {
    const { error } = await supabase
      .from("packages")
      .update({ destination_rank: u.destination_rank as never })
      .eq("slug", u.slug);
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/destinations/${destinationSlug}`);
  revalidatePath(`/admin/destinations/${destinationSlug}`);
  return { ok: true };
}
