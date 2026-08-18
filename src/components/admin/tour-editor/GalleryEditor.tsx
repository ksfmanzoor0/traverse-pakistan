"use client";

import { useRef, useState } from "react";
import Image from "next/image";

export type GalleryImage = { url: string; alt: string };

// Edit tour/package images inline. First entry is treated as the cover.
// Upload → POST /api/admin/{kind}/[slug]/images (returns R2 URL)
// Delete → DELETE ?url=... (removes from R2 too if it's a bucket URL)
// Reorder → ↑ / ↓ buttons; Save persists the array via the caller's server action.
export function GalleryEditor({
  tourSlug,
  images,
  onChange,
  resourceKind = "tours",
}: {
  tourSlug: string;
  images: GalleryImage[];
  onChange: (next: GalleryImage[]) => void;
  /** Which resource's upload endpoint to hit. Defaults to "tours" for
   *  backwards compat with the existing tour editor. */
  resourceKind?: "tours" | "packages" | "blog";
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onFile(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploaded: GalleryImage[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch(`/api/admin/${resourceKind}/${tourSlug}/images`, { method: "POST", body: form });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Upload failed (${res.status})`);
        }
        const { url } = (await res.json()) as { url: string };
        uploaded.push({ url, alt: file.name.replace(/\.[^.]+$/, "") });
      }
      onChange([...images, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= images.length) return;
    const next = images.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }

  async function remove(i: number) {
    const img = images[i];
    if (!confirm(`Remove this image?\n${img.url}\n\nThis deletes it from R2 too if it's stored there.`)) return;
    onChange(images.filter((_, idx) => idx !== i));
    // Fire-and-forget R2 delete. If it fails, the DB list already dropped it —
    // the file becomes an orphan in the bucket but doesn't break anything.
    try {
      await fetch(`/api/admin/${resourceKind}/${tourSlug}/images?url=${encodeURIComponent(img.url)}`, { method: "DELETE" });
    } catch { /* ignore */ }
  }

  function setAlt(i: number, alt: string) {
    const next = images.slice();
    next[i] = { ...next[i], alt };
    onChange(next);
  }

  return (
    <div className="space-y-4">
      {error && <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-[13px]">{error}</div>}

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="h-10 px-4 text-[13px] font-semibold bg-[var(--primary)] text-[var(--text-inverse)] rounded-[var(--radius-sm)] disabled:opacity-60"
        >
          {uploading ? "Uploading…" : "+ Upload images"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={(e) => onFile(e.target.files)}
        />
        <span className="text-[12px] text-[var(--text-tertiary)]">
          JPEG, PNG, WEBP, or AVIF · max 10 MB each · first image is the cover
        </span>
      </div>

      {images.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-[var(--border-default)] rounded-[var(--radius-sm)] text-[13px] text-[var(--text-tertiary)]">
          No images yet. Uploads land in R2 and appear here.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {images.map((img, i) => (
            <div key={img.url + i} className="border border-[var(--border-default)] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--bg-primary)]">
              <div className="relative aspect-[4/3] bg-[var(--bg-subtle)]">
                <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" unoptimized />
                {i === 0 && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--primary)] text-[var(--text-inverse)]">
                    Cover
                  </span>
                )}
              </div>
              <div className="p-2 space-y-2">
                <input
                  value={img.alt}
                  onChange={(e) => setAlt(i, e.target.value)}
                  placeholder="Alt text"
                  className="w-full h-8 px-2 border border-[var(--border-default)] rounded text-[12px] bg-[var(--bg-primary)]"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="h-7 px-2 text-[11px] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-subtle)] disabled:opacity-30">↑</button>
                    <button type="button" onClick={() => move(i, +1)} disabled={i === images.length - 1} className="h-7 px-2 text-[11px] text-[var(--text-secondary)] rounded hover:bg-[var(--bg-subtle)] disabled:opacity-30">↓</button>
                  </div>
                  <button type="button" onClick={() => remove(i)} className="h-7 px-2 text-[11px] font-semibold text-[var(--error)] rounded hover:bg-[var(--bg-subtle)]">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
