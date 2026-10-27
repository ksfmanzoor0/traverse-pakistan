"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";

type UploadResult = { ok: boolean; url?: string; error?: string };

type Props = {
  slug: string;
  packageName: string;
  initialUrl: string | null;
  initialAlt: string | null;
  uploadAction: (
    slug: string,
    base64: string,
    contentType: string,
    altText?: string,
  ) => Promise<UploadResult>;
};

const ACCEPTED = "image/jpeg,image/png,image/webp,image/avif";
const MAX_BYTES = 8 * 1024 * 1024;

async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // Chunked encode to avoid the "Maximum call stack size exceeded" trap on big
  // images when calling String.fromCharCode on the full byte array.
  let binary = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export function PackageCoverEditor({
  slug,
  packageName,
  initialUrl,
  initialAlt,
  uploadAction,
}: Props) {
  const [currentUrl, setCurrentUrl] = useState<string | null>(initialUrl);
  const [alt, setAlt] = useState<string>(initialAlt ?? `${packageName} — cover`);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "error" | "ok"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePick(e: React.ChangeEvent<HTMLInputElement>) {
    setStatus(null);
    const next = e.target.files?.[0] ?? null;
    if (!next) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (next.size > MAX_BYTES) {
      setStatus({ kind: "error", text: "File exceeds 8 MB" });
      setFile(null);
      setPreview(null);
      e.target.value = "";
      return;
    }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  function handleUpload() {
    if (!file) return;
    const chosen = file;
    const altValue = alt.trim();
    startTransition(async () => {
      try {
        const base64 = await fileToBase64(chosen);
        const res = await uploadAction(slug, base64, chosen.type, altValue || undefined);
        if (!res.ok || !res.url) {
          setStatus({ kind: "error", text: res.error ?? "Upload failed" });
          return;
        }
        setCurrentUrl(res.url);
        setFile(null);
        setPreview(null);
        if (inputRef.current) inputRef.current.value = "";
        setStatus({ kind: "ok", text: "Cover updated. Site refreshes within a few seconds." });
      } catch (err) {
        setStatus({ kind: "error", text: (err as Error).message || "Upload failed" });
      }
    });
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">Cover image</h3>
          <p className="text-[12px] text-[var(--text-tertiary)]">
            Shown as the first image on the package detail and listing cards. JPG, PNG, WEBP, or AVIF. Max 8 MB.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
            Current
          </p>
          <div className="relative aspect-[16/9] rounded-[var(--radius-sm)] overflow-hidden border border-[var(--border-default)] bg-[var(--bg-subtle)]">
            {currentUrl ? (
              <Image
                src={currentUrl}
                alt={alt || `${packageName} cover`}
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[var(--text-tertiary)]">
                No cover set
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
            New
          </p>
          <div className="relative aspect-[16/9] rounded-[var(--radius-sm)] overflow-hidden border border-dashed border-[var(--border-default)] bg-[var(--bg-subtle)]">
            {preview ? (
              <Image
                src={preview}
                alt="New cover preview"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-[12px] text-[var(--text-tertiary)]">
                Pick a file below
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1">
          Alt text (SEO + screen readers)
        </label>
        <input
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder={`${packageName} — cover`}
          className="w-full h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
        />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={handlePick}
          disabled={pending}
          className="text-[12px] text-[var(--text-secondary)]"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={!file || pending}
          className="h-10 px-4 rounded-[var(--radius-sm)] text-[13px] font-semibold disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--on-primary, white)",
            border: "1px solid var(--primary)",
          }}
        >
          {pending ? "Uploading…" : "Replace cover"}
        </button>
      </div>

      {status && (
        <p
          className="text-[12px]"
          style={{ color: status.kind === "ok" ? "var(--success)" : "var(--error)" }}
        >
          {status.text}
        </p>
      )}
    </div>
  );
}
