"use client";

import { useState, useTransition } from "react";
import type { PackagePatch, PackagePricing } from "@/app/admin/packages/actions";

type TierPricingIn = { islamabad?: number; lahore?: number; karachi?: number; singleSupplement?: number };

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
  pricing: { deluxe?: TierPricingIn; luxury?: TierPricingIn } | null;
  starting_cities: string[] | null;
  total_distance_km: number | null;
  meals_per_person: number | null;
  entries_per_person: number | null;
  destination_rank: Record<string, number> | null;
};

const CITY_KEYS = ["KDU", "ISB", "LHE", "KHI"] as const;
type CityKey = (typeof CITY_KEYS)[number];

type TierPriceForm = { islamabad: string; lahore: string; karachi: string; singleSupplement: string };
function pricingToForm(p: TierPricingIn | undefined): TierPriceForm {
  return {
    islamabad: p?.islamabad?.toString() ?? "",
    lahore: p?.lahore?.toString() ?? "",
    karachi: p?.karachi?.toString() ?? "",
    singleSupplement: p?.singleSupplement?.toString() ?? "",
  };
}
function formToTier(f: TierPriceForm): PackagePricing["deluxe"] {
  const n = (s: string) => (s.trim() === "" ? null : Number(s));
  return {
    islamabad: n(f.islamabad),
    lahore: n(f.lahore),
    karachi: n(f.karachi),
    singleSupplement: n(f.singleSupplement),
  };
}

type Option = { slug: string; name: string };

type Props = {
  row: Row;
  destinationOptions: Option[];
  regionOptions: Option[];
  updateAction: (slug: string, patch: PackagePatch) => Promise<{ ok: boolean; error?: string }>;
  deleteAction: (slug: string) => Promise<{ ok: boolean; error?: string }>;
  provisionR2Action?: (slug: string) => Promise<{ ok: boolean; key?: string; error?: string }>;
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

export function PackageEditor({ row, destinationOptions, regionOptions, updateAction, deleteAction, provisionR2Action }: Props) {
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
  const [deluxePricing, setDeluxePricing] = useState<TierPriceForm>(() => pricingToForm(row.pricing?.deluxe));
  const [luxuryPricing, setLuxuryPricing] = useState<TierPriceForm>(() => pricingToForm(row.pricing?.luxury));
  const [startingCities, setStartingCities] = useState<Set<CityKey>>(
    () => new Set(((row.starting_cities ?? []) as string[]).filter((c): c is CityKey => (CITY_KEYS as readonly string[]).includes(c))),
  );
  const [totalDistanceKm, setTotalDistanceKm] = useState(row.total_distance_km?.toString() ?? "");
  const [mealsPerPerson, setMealsPerPerson] = useState((row.meals_per_person ?? 0).toString());
  const [entriesPerPerson, setEntriesPerPerson] = useState((row.entries_per_person ?? 0).toString());
  const [destinationRank, setDestinationRank] = useState<Record<string, string>>(() => {
    const src = row.destination_rank ?? {};
    return Object.fromEntries(Object.entries(src).map(([k, v]) => [k, String(v)]));
  });

  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [savePending, startSave] = useTransition();
  const [deletePending, startDelete] = useTransition();
  const [r2Msg, setR2Msg] = useState<string | null>(null);
  const [r2Pending, startR2] = useTransition();

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
      pricing: {
        deluxe: formToTier(deluxePricing),
        luxury: formToTier(luxuryPricing),
      },
      starting_cities: Array.from(startingCities),
      total_distance_km: totalDistanceKm.trim() ? Number(totalDistanceKm) : null,
      meals_per_person: Math.max(0, Number(mealsPerPerson) || 0),
      entries_per_person: Math.max(0, Number(entriesPerPerson) || 0),
      destination_rank: Object.fromEntries(
        Object.entries(destinationRank)
          .filter(([, v]) => v.trim() !== "" && !Number.isNaN(Number(v)))
          .map(([k, v]) => [k, Number(v)]),
      ),
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

  function onProvisionR2() {
    if (!provisionR2Action) return;
    setR2Msg(null);
    startR2(async () => {
      const res = await provisionR2Action(row.slug);
      if (res.ok) setR2Msg(`Created packages/${row.slug}/`);
      else setR2Msg(res.error ?? "R2 provision failed");
    });
  }

  function toggleRelated(slug: string) {
    setRelated((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  }

  function toggleCity(c: CityKey) {
    setStartingCities((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  function updateDeluxe(key: keyof TierPriceForm, value: string) {
    setDeluxePricing((prev) => ({ ...prev, [key]: value }));
  }
  function updateLuxury(key: keyof TierPriceForm, value: string) {
    setLuxuryPricing((prev) => ({ ...prev, [key]: value }));
  }
  function updateRank(slug: string, value: string) {
    setDestinationRank((prev) => ({ ...prev, [slug]: value }));
  }

  const rankSlugs = Array.from(new Set([destinationSlug, ...related].filter(Boolean)));
  const destinationNameBySlug = Object.fromEntries(destinationOptions.map((d) => [d.slug, d.name]));

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
        className="p-5 rounded-2xl space-y-5"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-[14px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Pricing (PKR per person)
          </h2>
          <span className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
            Leave blank for cities where this package isn&apos;t offered.
          </span>
        </div>
        {(["deluxe", "luxury"] as const).map((tier) => {
          const form = tier === "deluxe" ? deluxePricing : luxuryPricing;
          const set = tier === "deluxe" ? updateDeluxe : updateLuxury;
          return (
            <div key={tier}>
              <div className="text-[12px] font-semibold capitalize mb-2" style={{ color: "var(--text-secondary)" }}>
                {tier} tier
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["islamabad", "lahore", "karachi", "singleSupplement"] as const).map((k) => (
                  <div key={k}>
                    <label className={labelCls} style={labelStyle}>
                      {k === "singleSupplement" ? "Single supp." : k}
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form[k]}
                      onChange={(e) => set(k, e.target.value)}
                      placeholder="—"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section
        className="p-5 rounded-2xl space-y-5"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-[14px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
            Engine
          </h2>
          {provisionR2Action && (
            <div className="flex items-center gap-3">
              {r2Msg && (
                <span className="text-[12px]" style={{ color: r2Msg.startsWith("Created") ? "var(--success)" : "var(--error)" }}>
                  {r2Msg}
                </span>
              )}
              <button
                type="button"
                onClick={onProvisionR2}
                disabled={r2Pending}
                className="h-8 px-3 rounded-[var(--radius-sm)] border text-[12px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
                title={`Create packages/${row.slug}/ marker in R2`}
              >
                {r2Pending ? "Creating…" : "Provision R2 folder"}
              </button>
            </div>
          )}
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Starting cities (departures offered)</label>
          <div className="flex flex-wrap gap-2">
            {CITY_KEYS.map((c) => {
              const active = startingCities.has(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCity(c)}
                  className="px-3 py-1 rounded-full text-[12px] font-semibold cursor-pointer"
                  style={{
                    background: active ? "var(--primary)" : "var(--bg-subtle)",
                    color: active ? "var(--text-inverse)" : "var(--text-secondary)",
                    border: `1px solid ${active ? "var(--primary)" : "var(--border-default)"}`,
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls} style={labelStyle}>Total distance (km)</label>
            <input
              type="number"
              min={0}
              value={totalDistanceKm}
              onChange={(e) => setTotalDistanceKm(e.target.value)}
              placeholder="e.g. 1126"
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Meals / person</label>
            <input
              type="number"
              min={0}
              value={mealsPerPerson}
              onChange={(e) => setMealsPerPerson(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>
          <div>
            <label className={labelCls} style={labelStyle}>Entries / person</label>
            <input
              type="number"
              min={0}
              value={entriesPerPerson}
              onChange={(e) => setEntriesPerPerson(e.target.value)}
              className={inputCls}
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label className={labelCls} style={labelStyle}>Destination rank</label>
          <p className="text-[11px] mb-2" style={{ color: "var(--text-tertiary)" }}>
            Lower shows this package earlier on the destination page. Set per destination you want it to appear under.
          </p>
          {rankSlugs.length === 0 && (
            <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
              Pick a primary or related destination first.
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {rankSlugs.map((slug) => (
              <div key={slug} className="flex items-center gap-2">
                <div className="flex-1 text-[13px] truncate" style={{ color: "var(--text-secondary)" }}>
                  {destinationNameBySlug[slug] ?? slug}
                  <span className="ml-1 text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>({slug})</span>
                </div>
                <input
                  type="number"
                  value={destinationRank[slug] ?? ""}
                  onChange={(e) => updateRank(slug, e.target.value)}
                  placeholder="rank"
                  className="w-24 h-9 px-2 rounded-[var(--radius-sm)] border text-[13px] tabular-nums"
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>
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
