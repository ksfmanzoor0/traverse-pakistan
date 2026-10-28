"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { putR2Object, deleteR2Object, r2KeyFromUrl } from "@/lib/r2";

export type HeroSlideRow = {
  id: string;
  url: string;
  alt: string;
  position: number;
  published: boolean;
};

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const MAX_BYTES = 8 * 1024 * 1024;

// hero_slides is not yet in the generated Supabase types; use a loose cast
// so the chain-builder methods (order/limit/eq/maybeSingle/single) are reachable.
/* eslint-disable @typescript-eslint/no-explicit-any */
function heroTable(): any {
  return (getSupabaseAdmin() as any).from("hero_slides");
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function revalidateHome() {
  revalidateTag("hero-slides", {});
  revalidatePath("/");
  revalidatePath("/admin/hero-slides");
}

function normalize(row: unknown): HeroSlideRow {
  const r = row as HeroSlideRow;
  return {
    id: String(r.id),
    url: r.url,
    alt: r.alt ?? "",
    position: r.position ?? 0,
    published: !!r.published,
  };
}

export async function listHeroSlides(): Promise<{ ok: boolean; rows?: HeroSlideRow[]; error?: string }> {
  await requireAdmin();
  const { data, error } = await heroTable()
    .select("id, url, alt, position, published")
    .order("position", { ascending: true });
  if (error) return { ok: false, error: error.message };
  return { ok: true, rows: (data as unknown[]).map(normalize) };
}

export async function uploadHeroSlide(
  base64: string,
  contentType: string,
  altText: string,
): Promise<{ ok: boolean; row?: HeroSlideRow; error?: string }> {
  await requireAdmin();

  const ext = MIME_EXT[contentType.toLowerCase()];
  if (!ext) return { ok: false, error: "Only JPG, PNG, WEBP, or AVIF allowed" };

  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  if (bytes.length === 0) return { ok: false, error: "Empty file" };
  if (bytes.length > MAX_BYTES) return { ok: false, error: "File exceeds 8 MB" };

  const key = `homepageslider/slide-${Date.now()}.${ext}`;
  const putRes = await putR2Object(key, bytes, contentType);
  if (!putRes.ok || !putRes.url) return { ok: false, error: putRes.error ?? "R2 upload failed" };

  const { data: posData, error: posErr } = await heroTable()
    .select("position")
    .order("position", { ascending: false })
    .limit(1);
  if (posErr) return { ok: false, error: `Position read failed: ${posErr.message}` };
  const maxPos = (posData as Array<{ position: number }>)?.[0]?.position ?? 0;

  const { data, error } = await heroTable()
    .insert({
      url: putRes.url,
      alt: altText.trim() || "Pakistan travel destination",
      position: maxPos + 10,
      published: true,
    })
    .select("id, url, alt, position, published")
    .single();
  if (error) return { ok: false, error: `DB insert failed: ${error.message}` };

  revalidateHome();
  return { ok: true, row: normalize(data) };
}

export async function deleteHeroSlide(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const { data: existing, error: readErr } = await heroTable()
    .select("url")
    .eq("id", id)
    .maybeSingle();
  if (readErr) return { ok: false, error: `Read failed: ${readErr.message}` };
  if (!existing) return { ok: false, error: "Slide not found" };

  const { error } = await heroTable().delete().eq("id", id);
  if (error) return { ok: false, error: `DB delete failed: ${error.message}` };

  const url = (existing as { url: string }).url;
  const key = r2KeyFromUrl(url);
  if (key) {
    const r2Res = await deleteR2Object(key);
    if (!r2Res.ok) {
      revalidateHome();
      return { ok: true, error: `Removed from site, but R2 cleanup failed: ${r2Res.error}` };
    }
  }

  revalidateHome();
  return { ok: true };
}

export async function setHeroSlidePublished(
  id: string,
  published: boolean,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const { error } = await heroTable()
    .update({ published, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateHome();
  return { ok: true };
}

export async function updateHeroSlideAlt(
  id: string,
  alt: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const { error } = await heroTable()
    .update({
      alt: alt.trim() || "Pakistan travel destination",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateHome();
  return { ok: true };
}

export async function reorderHeroSlides(
  orderedIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "No ids provided" };
  }
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await heroTable()
      .update({ position: (i + 1) * 10, updated_at: new Date().toISOString() })
      .eq("id", orderedIds[i]);
    if (error) return { ok: false, error: `Reorder failed at #${i + 1}: ${error.message}` };
  }
  revalidateHome();
  return { ok: true };
}
