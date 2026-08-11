"use client";

import { useState, useTransition } from "react";
import type { NewTourInput } from "@/app/admin/tours/actions";

const CATEGORIES = [
  "group-tour", "trekking", "cultural", "luxury", "adventure",
  "camping", "wildlife", "skiing", "coastal",
] as const;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface Props {
  createAction: (input: NewTourInput) => Promise<{ ok: boolean; slug?: string; error?: string } | void>;
}

export function NewTourForm({ createAction }: Props) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState<string>("group-tour");
  const [duration, setDuration] = useState(5);
  const [destinationSlug, setDestinationSlug] = useState("");
  const [regionSlug, setRegionSlug] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!name || !slug || !destinationSlug || !regionSlug) {
      setError("Please fill in all required fields.");
      return;
    }
    startTransition(async () => {
      const r = await createAction({
        slug,
        name,
        category,
        duration,
        destination_slug: destinationSlug,
        region_slug: regionSlug,
      });
      // If the server redirected, this line never runs. Only reached on error.
      if (r && !r.ok) setError(r.error ?? "Failed to create tour");
    });
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-[13px]">{error}</div>
      )}

      <Field label="Name">
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="e.g. Autumn Trip to Hunza"
          className={inputCls}
        />
      </Field>

      <Field label="Slug (URL)">
        <input
          value={slug}
          onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
          placeholder="autumn-trip-to-hunza"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Duration (days)">
          <input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value) || 1)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Destination slug">
          <input
            value={destinationSlug}
            onChange={(e) => setDestinationSlug(e.target.value)}
            placeholder="hunza"
            className={inputCls}
          />
        </Field>
        <Field label="Region slug">
          <input
            value={regionSlug}
            onChange={(e) => setRegionSlug(e.target.value)}
            placeholder="gilgit-baltistan"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="flex justify-end pt-3 border-t border-[var(--border-default)]">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="h-10 px-4 text-[13px] font-semibold bg-[var(--primary)] text-[var(--text-inverse)] rounded-[var(--radius-sm)] disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create tour"}
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full h-10 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">{label}</span>
      {children}
    </label>
  );
}
