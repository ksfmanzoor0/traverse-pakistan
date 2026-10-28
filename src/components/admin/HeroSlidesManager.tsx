"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import {
  uploadHeroSlide,
  deleteHeroSlide,
  setHeroSlidePublished,
  updateHeroSlideAlt,
  reorderHeroSlides,
  type HeroSlideRow,
} from "@/app/admin/hero-slides/actions";

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif";
const MAX_BYTES = 8 * 1024 * 1024;

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

type Status = { kind: "ok" | "error" | "warn"; text: string } | null;

export function HeroSlidesManager({ initialRows }: { initialRows: HeroSlideRow[] }) {
  const [rows, setRows] = useState<HeroSlideRow[]>(initialRows);
  const [status, setStatus] = useState<Status>(null);
  const [pending, startTransition] = useTransition();

  const [newFile, setNewFile] = useState<File | null>(null);
  const [newPreview, setNewPreview] = useState<string | null>(null);
  const [newAlt, setNewAlt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setStatus(null);
    const f = e.target.files?.[0] ?? null;
    if (!f) {
      setNewFile(null);
      setNewPreview(null);
      return;
    }
    if (f.size > MAX_BYTES) {
      setStatus({ kind: "error", text: `"${f.name}" is ${(f.size / 1024 / 1024).toFixed(1)} MB — max 8 MB.` });
      setNewFile(null);
      setNewPreview(null);
      e.target.value = "";
      return;
    }
    setNewFile(f);
    setNewPreview(URL.createObjectURL(f));
  }

  function handleUpload() {
    if (!newFile) {
      setStatus({ kind: "error", text: "Pick a file first." });
      return;
    }
    const chosen = newFile;
    const alt = newAlt.trim();
    startTransition(async () => {
      try {
        const b64 = await fileToBase64(chosen);
        const res = await uploadHeroSlide(b64, chosen.type, alt);
        if (!res.ok || !res.row) {
          setStatus({ kind: "error", text: res.error ?? "Upload failed" });
          return;
        }
        setRows((prev) => [...prev, res.row!]);
        setNewFile(null);
        setNewPreview(null);
        setNewAlt("");
        if (inputRef.current) inputRef.current.value = "";
        setStatus({ kind: "ok", text: "Slide added. Homepage refreshes within a few seconds." });
      } catch (err) {
        setStatus({ kind: "error", text: (err as Error).message || "Upload failed" });
      }
    });
  }

  function handleDelete(row: HeroSlideRow) {
    const confirmText = `Delete this slide? This removes it from the site AND the R2 bucket.`;
    if (!confirm(confirmText)) return;
    startTransition(async () => {
      const res = await deleteHeroSlide(row.id);
      if (!res.ok) {
        setStatus({ kind: "error", text: res.error ?? "Delete failed" });
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setStatus(
        res.error
          ? { kind: "warn", text: res.error }
          : { kind: "ok", text: "Slide deleted." },
      );
    });
  }

  function handleTogglePublished(row: HeroSlideRow) {
    const next = !row.published;
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, published: next } : r)));
    startTransition(async () => {
      const res = await setHeroSlidePublished(row.id, next);
      if (!res.ok) {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, published: !next } : r)));
        setStatus({ kind: "error", text: res.error ?? "Publish toggle failed" });
      } else {
        setStatus({ kind: "ok", text: next ? "Slide published." : "Slide hidden." });
      }
    });
  }

  function handleAltBlur(row: HeroSlideRow, nextAlt: string) {
    if (nextAlt.trim() === row.alt) return;
    startTransition(async () => {
      const res = await updateHeroSlideAlt(row.id, nextAlt);
      if (!res.ok) {
        setStatus({ kind: "error", text: res.error ?? "Alt update failed" });
      } else {
        setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, alt: nextAlt.trim() } : r)));
        setStatus({ kind: "ok", text: "Alt text saved." });
      }
    });
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    const tmp = next[index];
    next[index] = next[target];
    next[target] = tmp;
    setRows(next);
    const orderedIds = next.map((r) => r.id);
    startTransition(async () => {
      const res = await reorderHeroSlides(orderedIds);
      if (!res.ok) {
        setRows(rows);
        setStatus({ kind: "error", text: res.error ?? "Reorder failed" });
      } else {
        setStatus({ kind: "ok", text: "Order updated." });
      }
    });
  }

  return (
    <div className="space-y-6">
      {status && (
        <div
          className="rounded-[var(--radius-md)] border p-3 text-sm"
          style={{
            borderColor:
              status.kind === "ok"
                ? "var(--success)"
                : status.kind === "warn"
                  ? "var(--warning)"
                  : "var(--error)",
            background:
              status.kind === "ok"
                ? "color-mix(in srgb, var(--success) 10%, transparent)"
                : status.kind === "warn"
                  ? "color-mix(in srgb, var(--warning) 12%, transparent)"
                  : "color-mix(in srgb, var(--error) 10%, transparent)",
            color:
              status.kind === "ok"
                ? "var(--success)"
                : status.kind === "warn"
                  ? "var(--warning)"
                  : "var(--error)",
          }}
        >
          {status.text}
        </div>
      )}

      <section
        className="rounded-[var(--radius-md)] border p-5 space-y-4"
        style={{ borderColor: "var(--border-default)" }}
      >
        <div>
          <h2 className="text-base font-semibold text-[var(--text-primary)]">Add a new slide</h2>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">
            JPG, PNG, WEBP, or AVIF. Max 8 MB. New slides are published by default and appear at the end
            of the rotation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
          <div
            className="relative aspect-[16/9] rounded-[var(--radius-sm)] overflow-hidden border border-dashed bg-[var(--bg-subtle)]"
            style={{ borderColor: "var(--border-default)" }}
          >
            {newPreview ? (
              <Image
                src={newPreview}
                alt="New slide preview"
                fill
                sizes="220px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[var(--text-tertiary)]">
                Preview
              </div>
            )}
          </div>

          <div className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              onChange={pickFile}
              disabled={pending}
              className="sr-only"
              id="hero-new-file"
            />
            <div className="flex items-center gap-3 flex-wrap">
              <label
                htmlFor="hero-new-file"
                className="h-12 px-6 inline-flex items-center justify-center rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer"
                style={{
                  background: "color-mix(in srgb, var(--primary) 12%, transparent)",
                  color: "var(--primary)",
                  border: "2px dashed var(--primary)",
                  opacity: pending ? 0.5 : 1,
                }}
              >
                {newFile ? "Choose a different image" : "Choose image"}
              </label>
              <span className="text-sm text-[var(--text-secondary)] max-w-[280px] truncate">
                {newFile ? newFile.name : "No image selected"}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 uppercase tracking-wider">
                Alt text (SEO + screen readers)
              </label>
              <input
                type="text"
                value={newAlt}
                onChange={(e) => setNewAlt(e.target.value)}
                placeholder="e.g. Autumn Khaplu suspension bridge"
                disabled={pending}
                className="w-full h-10 px-3 rounded-[var(--radius-sm)] border text-sm bg-[var(--bg-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                style={{ borderColor: "var(--border-default)" }}
              />
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!newFile || pending}
              className="h-12 px-6 rounded-[var(--radius-sm)] text-sm font-semibold disabled:opacity-40"
              style={{
                background: "var(--primary)",
                color: "var(--on-primary, white)",
                border: "1px solid var(--primary)",
              }}
            >
              {pending ? "Uploading…" : "Add slide"}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-[var(--text-primary)]">
            Current slides ({rows.length})
          </h2>
          <span className="text-xs text-[var(--text-tertiary)]">
            Top of the list = first slide shown.
          </span>
        </div>

        {rows.length === 0 && (
          <p className="text-sm text-[var(--text-tertiary)]">No slides yet. Add one above.</p>
        )}

        <ul className="space-y-3">
          {rows.map((row, idx) => (
            <li
              key={row.id}
              className="grid grid-cols-[220px_1fr_auto] gap-4 items-center p-4 rounded-[var(--radius-md)] border"
              style={{
                borderColor: "var(--border-default)",
                background: row.published ? "var(--bg-primary)" : "var(--bg-subtle)",
                opacity: row.published ? 1 : 0.72,
              }}
            >
              <div
                className="relative aspect-[16/9] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--bg-subtle)]"
              >
                <Image
                  src={row.url}
                  alt={row.alt || "Hero slide"}
                  fill
                  sizes="220px"
                  className="object-cover"
                  unoptimized
                />
                <div
                  className="absolute top-2 left-2 h-6 min-w-6 px-2 rounded-full text-[11px] font-bold flex items-center justify-center"
                  style={{
                    background: "rgba(0,0,0,0.6)",
                    color: "white",
                  }}
                >
                  {idx + 1}
                </div>
              </div>

              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: row.published
                        ? "color-mix(in srgb, var(--success) 15%, transparent)"
                        : "color-mix(in srgb, var(--text-tertiary) 18%, transparent)",
                      color: row.published ? "var(--success)" : "var(--text-tertiary)",
                    }}
                  >
                    {row.published ? "Published" : "Hidden"}
                  </span>
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-[var(--text-tertiary)] truncate hover:underline"
                    title={row.url}
                  >
                    {row.url.split("/").pop()}
                  </a>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--text-tertiary)] mb-1 uppercase tracking-wider">
                    Alt text
                  </label>
                  <input
                    type="text"
                    defaultValue={row.alt}
                    onBlur={(e) => handleAltBlur(row, e.currentTarget.value)}
                    disabled={pending}
                    className="w-full h-9 px-2 rounded-[var(--radius-sm)] border text-sm bg-[var(--bg-primary)] text-[var(--text-primary)]"
                    style={{ borderColor: "var(--border-default)" }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 items-stretch">
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => move(idx, -1)}
                    disabled={pending || idx === 0}
                    className="h-8 w-8 rounded-[var(--radius-sm)] border text-sm font-bold disabled:opacity-30"
                    style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(idx, 1)}
                    disabled={pending || idx === rows.length - 1}
                    className="h-8 w-8 rounded-[var(--radius-sm)] border text-sm font-bold disabled:opacity-30"
                    style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => handleTogglePublished(row)}
                  disabled={pending}
                  className="h-8 px-3 rounded-[var(--radius-sm)] border text-xs font-semibold"
                  style={{
                    borderColor: "var(--border-default)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {row.published ? "Hide" : "Publish"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  disabled={pending}
                  className="h-8 px-3 rounded-[var(--radius-sm)] text-xs font-semibold"
                  style={{
                    background: "color-mix(in srgb, var(--error) 10%, transparent)",
                    color: "var(--error)",
                    border: "1px solid color-mix(in srgb, var(--error) 25%, transparent)",
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
