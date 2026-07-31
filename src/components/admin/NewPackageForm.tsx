"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, useMemo } from "react";
import type { NewPackageInput } from "@/app/admin/packages/actions";

type Option = { slug: string; name: string };

type Props = {
  destinations: Option[];
  regions: Option[];
  createAction: (input: NewPackageInput) => Promise<{ ok: boolean; slug?: string; error?: string }>;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const inputCls = "w-full h-10 px-3 rounded-[var(--radius-sm)] border text-[14px]";
const inputStyle: React.CSSProperties = { borderColor: "var(--border-default)", background: "var(--bg-primary)" };
const labelCls = "block text-[12px] font-semibold uppercase tracking-wider mb-1";
const labelStyle: React.CSSProperties = { color: "var(--text-tertiary)" };

export function NewPackageForm({ destinations, regions, createAction }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [duration, setDuration] = useState("5");
  const [destinationSlug, setDestinationSlug] = useState("");
  const [regionSlug, setRegionSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const effectiveSlug = useMemo(() => (slugTouched ? slugify(slug) : slugify(name)), [slug, slugTouched, name]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const res = await createAction({
        slug: effectiveSlug,
        name: name.trim(),
        duration: Number(duration) || 1,
        destination_slug: destinationSlug,
        region_slug: regionSlug,
      });
      if (!res.ok) {
        setError(res.error ?? "Create failed");
        return;
      }
      router.push(`/admin/packages/${res.slug}`);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section
        className="p-5 rounded-2xl space-y-4"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <div>
          <label className={labelCls} style={labelStyle}>Name *</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className={inputCls} style={inputStyle} />
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Slug (URL) *</label>
          <input
            value={slugTouched ? slug : effectiveSlug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugTouched(true);
            }}
            required
            className={`${inputCls} font-mono`}
            style={inputStyle}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
            Public URL will be <span className="font-mono">/packages/{effectiveSlug || "…"}</span>. Cannot be changed after creation.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Primary destination *</label>
            <select
              value={destinationSlug}
              onChange={(e) => setDestinationSlug(e.target.value)}
              required
              className={inputCls}
              style={inputStyle}
            >
              <option value="">Select…</option>
              {destinations.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Region *</label>
            <select
              value={regionSlug}
              onChange={(e) => setRegionSlug(e.target.value)}
              required
              className={inputCls}
              style={inputStyle}
            >
              <option value="">Select…</option>
              {regions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Duration (days) *</label>
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            required
            className={inputCls}
            style={inputStyle}
          />
        </div>
      </section>

      {error && (
        <div className="text-[13px]" style={{ color: "var(--error)" }}>
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Link href="/admin/packages" className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-5 rounded-[var(--radius-sm)] text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
        >
          {pending ? "Creating…" : "Create package"}
        </button>
      </div>
    </form>
  );
}
