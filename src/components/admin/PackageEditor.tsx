"use client";

import { useState, useTransition } from "react";
import type { PackagePatch } from "@/app/admin/packages/actions";

type Row = {
  slug: string;
  name: string;
  description: string;
  badge: string | null;
  duration: number;
  route: string | null;
  destination_slug: string;
  related_destination_slugs: string[] | null;
  region_slug: string;
  highlights: string[] | null;
  inclusions: string[] | null;
  exclusions: string[] | null;
  know_before_you_go: string[] | null;
  max_group_size: number | null;
  languages: string[] | null;
  published: boolean;
  meta_title: string | null;
  meta_description: string | null;
  updated_at: string | null;
};

type Option = { slug: string; name: string };

type Props = {
  row: Row;
  destinationOptions: Option[];
  regionOptions: Option[];
  updateAction: (slug: string, patch: PackagePatch) => Promise<{ ok: boolean; error?: string }>;
  deleteAction: (slug: string) => Promise<{ ok: boolean; error?: string }>;
};

const BADGES = ["", "new", "popular", "bestseller", "editors-pick"];

const inputCls =
  "w-full h-10 px-3 rounded-[var(--radius-sm)] border text-[14px]";
const inputStyle: React.CSSProperties = { borderColor: "var(--border-default)", background: "var(--bg-primary)" };
const areaCls = "w-full px-3 py-2 rounded-[var(--radius-sm)] border text-[14px] leading-[1.5]";
const labelCls = "block text-[12px] font-semibold uppercase tracking-wider mb-1";
const labelStyle: React.CSSProperties = { color: "var(--text-tertiary)" };

function StringListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  function update(i: number, value: string) {
    onChange(items.map((it, idx) => (idx === i ? value : it)));
  }
  function add() {
    onChange([...items, ""]);
  }
  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i));
  }
  function move(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div>
      <label className={labelCls} style={labelStyle}>{label}</label>
      <div className="space-y-2">
        {items.length === 0 && (
          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            None yet — click Add.
          </p>
        )}
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                aria-label="Move up"
                className="w-5 h-5 rounded text-[12px] border cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                aria-label="Move down"
                className="w-5 h-5 rounded text-[12px] border cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
              >
                ↓
              </button>
            </div>
            <input
              value={it}
              onChange={(e) => update(i, e.target.value)}
              placeholder={placeholder}
              className={inputCls}
              style={inputStyle}
            />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove"
              className="h-8 px-2 text-[12px] font-medium rounded-full cursor-pointer"
              style={{
                color: "var(--error)",
                background: "color-mix(in srgb, var(--error) 8%, transparent)",
                border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="text-[13px] font-semibold cursor-pointer"
          style={{ color: "var(--primary)" }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

export function PackageEditor({ row, destinationOptions, regionOptions, updateAction, deleteAction }: Props) {
  const [name, setName] = useState(row.name);
  const [description, setDescription] = useState(row.description);
  const [badge, setBadge] = useState(row.badge ?? "");
  const [duration, setDuration] = useState(String(row.duration));
  const [route, setRoute] = useState(row.route ?? "");
  const [destinationSlug, setDestinationSlug] = useState(row.destination_slug);
  const [related, setRelated] = useState<string[]>(row.related_destination_slugs ?? []);
  const [regionSlug, setRegionSlug] = useState(row.region_slug);
  const [highlights, setHighlights] = useState<string[]>(row.highlights ?? []);
  const [inclusions, setInclusions] = useState<string[]>(row.inclusions ?? []);
  const [exclusions, setExclusions] = useState<string[]>(row.exclusions ?? []);
  const [knowBefore, setKnowBefore] = useState<string[]>(row.know_before_you_go ?? []);
  const [maxGroupSize, setMaxGroupSize] = useState(row.max_group_size?.toString() ?? "");
  const [languages, setLanguages] = useState<string[]>(row.languages ?? []);
  const [published, setPublished] = useState(row.published);
  const [metaTitle, setMetaTitle] = useState(row.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(row.meta_description ?? "");

  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();
  const [deletePending, startDelete] = useTransition();

  function onSave() {
    setSaveMsg(null);
    const patch: PackagePatch = {
      name: name.trim(),
      description: description.trim(),
      badge: badge || null,
      duration: Math.max(1, Number(duration) || row.duration),
      route: route.trim() || null,
      destination_slug: destinationSlug,
      related_destination_slugs: related.filter(Boolean),
      region_slug: regionSlug,
      highlights: highlights.map((s) => s.trim()).filter(Boolean),
      inclusions: inclusions.map((s) => s.trim()).filter(Boolean),
      exclusions: exclusions.map((s) => s.trim()).filter(Boolean),
      know_before_you_go: knowBefore.map((s) => s.trim()).filter(Boolean),
      max_group_size: maxGroupSize.trim() ? Number(maxGroupSize) : null,
      languages: languages.filter(Boolean),
      published,
      meta_title: metaTitle.trim() || null,
      meta_description: metaDescription.trim() || null,
    };
    startSave(async () => {
      const res = await updateAction(row.slug, patch);
      setSaveMsg(res.ok ? "Saved." : res.error ?? "Save failed");
      if (res.ok) setTimeout(() => setSaveMsg(null), 3000);
    });
  }

  function onDelete() {
    if (!confirm(`Delete package ${row.slug}? This cannot be undone.`)) return;
    startDelete(async () => {
      const res = await deleteAction(row.slug);
      if (!res.ok) alert(res.error ?? "Delete failed");
    });
  }

  function toggleRelated(slug: string) {
    setRelated((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  return (
    <div className="space-y-6">
      <section
        className="p-5 rounded-2xl"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
          Basics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls} style={labelStyle}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls} style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={areaCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Duration (days)</label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Badge</label>
            <select value={badge} onChange={(e) => setBadge(e.target.value)} className={inputCls} style={inputStyle}>
              {BADGES.map((b) => (
                <option key={b} value={b}>
                  {b || "(none)"}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls} style={labelStyle}>Route</label>
            <input value={route} onChange={(e) => setRoute(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Max group size</label>
            <input
              value={maxGroupSize}
              onChange={(e) => setMaxGroupSize(e.target.value)}
              placeholder="12"
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={published}
                onChange={(e) => setPublished(e.target.checked)}
              />
              <span className="text-[14px]" style={{ color: "var(--text-primary)" }}>Published</span>
            </label>
          </div>
        </div>
      </section>

      <section
        className="p-5 rounded-2xl"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
          Location
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Primary destination</label>
            <select
              value={destinationSlug}
              onChange={(e) => setDestinationSlug(e.target.value)}
              className={inputCls}
              style={inputStyle}
            >
              {destinationOptions.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Region</label>
            <select value={regionSlug} onChange={(e) => setRegionSlug(e.target.value)} className={inputCls} style={inputStyle}>
              {regionOptions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls} style={labelStyle}>Related destinations</label>
            <div className="flex flex-wrap gap-2">
              {destinationOptions.map((d) => {
                const active = related.includes(d.slug);
                return (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => toggleRelated(d.slug)}
                    className="px-2.5 py-1 rounded-full text-[12px] cursor-pointer"
                    style={{
                      background: active ? "var(--primary)" : "var(--bg-subtle)",
                      color: active ? "var(--text-inverse)" : "var(--text-secondary)",
                      border: `1px solid ${active ? "var(--primary)" : "var(--border-default)"}`,
                    }}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section
        className="p-5 rounded-2xl space-y-6"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-[14px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
          Content
        </h2>
        <StringListEditor label="Highlights" items={highlights} onChange={setHighlights} placeholder="e.g. Sunset at Rakaposhi View Point" />
        <StringListEditor label="Inclusions" items={inclusions} onChange={setInclusions} placeholder="What's included" />
        <StringListEditor label="Exclusions" items={exclusions} onChange={setExclusions} placeholder="What's not included" />
        <StringListEditor label="Know before you go" items={knowBefore} onChange={setKnowBefore} placeholder="Practical tip" />
        <StringListEditor label="Languages" items={languages} onChange={setLanguages} placeholder="English" />
      </section>

      <section
        className="p-5 rounded-2xl"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-[14px] font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-tertiary)" }}>
          SEO
        </h2>
        <div className="space-y-4">
          <div>
            <label className={labelCls} style={labelStyle}>Meta title</label>
            <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Meta description</label>
            <textarea
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
              className={areaCls}
              style={inputStyle}
            />
          </div>
        </div>
      </section>

      <div
        className="sticky bottom-4 flex items-center justify-between gap-4 p-3 rounded-2xl"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-lg)" }}
      >
        <button
          type="button"
          onClick={onDelete}
          disabled={deletePending}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-sm)] text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            color: "var(--error)",
            background: "color-mix(in srgb, var(--error) 8%, transparent)",
            border: "1px solid color-mix(in srgb, var(--error) 30%, transparent)",
          }}
        >
          {deletePending ? "Deleting…" : "Delete package"}
        </button>
        <div className="flex items-center gap-3">
          {saveMsg && (
            <span className="text-[13px]" style={{ color: "var(--text-secondary)" }}>{saveMsg}</span>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={savePending}
            className="h-10 px-5 rounded-[var(--radius-sm)] text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
          >
            {savePending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
