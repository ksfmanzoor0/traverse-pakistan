"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import type { PackageRow, PackageItineraryDayRow, PackageAddonRow } from "@/lib/supabase/types";
import type { AddonType } from "@/types/tour-addon";
import type { TourBlock } from "@/types/tour-block";
import type {
  PackagePatch,
  PackagePricing,
  TierPricing,
  ItineraryDayInput,
  PackageAddonPatch,
} from "@/app/admin/packages/actions";
import { StringList } from "./tour-editor/StringList";
import { CityAwareList } from "./tour-editor/CityAwareList";
import { CityChips } from "./tour-editor/CityChips";
import { AddonConfigForm } from "./tour-editor/AddonConfigForm";
import { GalleryEditor, type GalleryImage } from "./tour-editor/GalleryEditor";
import { BlockEditor } from "./tour-editor/BlockEditor";
import { AutoGrowTextarea } from "./tour-editor/AutoGrowTextarea";
import { ItineraryEditor } from "./ItineraryEditor";

type Home = "ISB" | "LHE" | "KHI" | "KDU";
type DestOption = { slug: string; name: string; region_slug: string | null };
type RegionOption = { slug: string; name: string };
type HotelOption = { slug: string; name: string; tier: string | null };

const ADDON_TYPES: AddonType[] = ["flight", "bus", "hotel", "meal", "activity", "transfer", "insurance", "custom"];
const CITY_KEYS: Home[] = ["ISB", "LHE", "KHI", "KDU"];

interface Actions {
  updatePackage: (slug: string, patch: PackagePatch) => Promise<{ ok: boolean; error?: string }>;
  deletePackage: (slug: string) => Promise<{ ok: boolean; error?: string }>;
  provisionR2Folder: (slug: string) => Promise<{ ok: boolean; key?: string; error?: string }>;
  renamePackageSlug: (oldSlug: string, newSlug: string) => Promise<{ ok: boolean; slug?: string; error?: string } | void>;
  upsertPackageAddon: (addon: PackageAddonPatch) => Promise<{ ok: boolean; id?: string; error?: string }>;
  deletePackageAddon: (id: string, packageSlug: string) => Promise<{ ok: boolean; error?: string }>;
  saveItinerary: (packageSlug: string, days: ItineraryDayInput[]) => Promise<{ ok: boolean; error?: string }>;
  repricePackage: (slug: string) => Promise<{ ok: boolean; written?: number; skipped?: Array<{ tier: string; home: string; reason: string }>; error?: string }>;
}

const TABS = ["Basics", "Gallery", "Content", "Highlights", "Inclusions", "Itinerary", "Pricing", "Addons", "Preview"] as const;

export function PackageEditor({
  row,
  days,
  addons,
  hotels,
  destinationOptions,
  regionOptions,
  actions,
}: {
  row: PackageRow;
  days: PackageItineraryDayRow[];
  addons: PackageAddonRow[];
  hotels: HotelOption[];
  destinationOptions: DestOption[];
  regionOptions: RegionOption[];
  actions: Actions;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Basics");
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // True when any input inside the tab body has changed since the last save.
  // onInput bubbles from every text input/textarea/select and marks the ref;
  // announce() clears it on a successful save. attemptTabChange checks the
  // ref to guard tab switches; useEffect wires browser nav-away as well.
  const dirtyRef = useRef(false);

  function announce(ok: boolean, msg: string) {
    if (ok) {
      setFlash(msg);
      setError(null);
      setTimeout(() => setFlash(null), 2000);
      dirtyRef.current = false;
    } else {
      setError(msg);
      setFlash(null);
    }
  }

  function attemptTabChange(next: (typeof TABS)[number]) {
    if (dirtyRef.current && !window.confirm("You have unsaved changes on this tab. Discard and continue?")) return;
    dirtyRef.current = false;
    setTab(next);
  }

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const saveViaUpdate = (patch: PackagePatch) => startTransition(async () => {
    const r = await actions.updatePackage(row.slug, patch);
    announce(r.ok, r.ok ? "Saved" : r.error ?? "Failed");
  });

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{row.name}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">/{row.slug}</p>
        </div>
        <a href={`/packages/${row.slug}`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-[var(--primary)] hover:underline">
          View live ↗
        </a>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-[var(--border-default)]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => attemptTabChange(t)}
            className={`px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors ${
              tab === t
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {flash && <div className="p-3 rounded bg-[var(--success)]/10 text-[var(--success)] text-[13px]">{flash}</div>}
      {error && <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-[13px]">{error}</div>}

      <div onInput={() => { dirtyRef.current = true; }}>
      {tab === "Basics" && (
        <BasicsSection
          row={row}
          destinationOptions={destinationOptions}
          regionOptions={regionOptions}
          onSave={saveViaUpdate}
          onRenameSlug={(newSlug) => new Promise((resolve) => {
            startTransition(async () => {
              const r = await actions.renamePackageSlug(row.slug, newSlug);
              if (r && !r.ok) {
                announce(false, r.error ?? "Rename failed");
                resolve({ ok: false, error: r.error });
              } else {
                resolve({ ok: true });
              }
            });
          })}
          pending={pending}
        />
      )}
      {tab === "Gallery" && (
        <GallerySection row={row} onSave={saveViaUpdate} pending={pending} />
      )}
      {tab === "Content" && (
        <ContentSection row={row} onSave={saveViaUpdate} pending={pending} />
      )}
      {tab === "Highlights" && (
        <HighlightsSection row={row} onSave={saveViaUpdate} pending={pending} />
      )}
      {tab === "Inclusions" && (
        <InclusionsSection row={row} onSave={saveViaUpdate} pending={pending} />
      )}
      {tab === "Itinerary" && (
        <ItineraryEditor
          packageSlug={row.slug}
          expectedDays={row.duration}
          initialDays={days}
          hotels={hotels}
          saveAction={actions.saveItinerary}
        />
      )}
      {tab === "Pricing" && (
        <PricingSection
          row={row}
          onSave={saveViaUpdate}
          onReprice={() => new Promise<void>((resolve) => {
            startTransition(async () => {
              const r = await actions.repricePackage(row.slug);
              if (r.ok) {
                const skippedCount = r.skipped?.length ?? 0;
                const msg = skippedCount > 0
                  ? `Repriced ${r.written} of ${(r.written ?? 0) + skippedCount} combos (${skippedCount} skipped — see console)`
                  : `Repriced ${r.written ?? 0} tier×city combos`;
                announce(true, msg);
                if (skippedCount > 0) console.warn("[reprice] skipped:", r.skipped);
              } else {
                announce(false, r.error ?? "Reprice failed");
              }
              resolve();
            });
          })}
          pending={pending}
        />
      )}
      {tab === "Addons" && (
        <AddonsSection
          packageSlug={row.slug}
          initialAddons={addons}
          actions={actions}
          pending={pending}
          announce={announce}
          startTransition={startTransition}
        />
      )}
      {tab === "Preview" && (
        <PreviewSection packageSlug={row.slug} startingCities={row.starting_cities as Home[]} />
      )}
      </div>
    </div>
  );
}

/* ============================ Basics ============================ */

function BasicsSection({
  row,
  destinationOptions,
  regionOptions,
  onSave,
  onRenameSlug,
  pending,
}: {
  row: PackageRow;
  destinationOptions: DestOption[];
  regionOptions: RegionOption[];
  onSave: (p: PackagePatch) => void;
  onRenameSlug: (newSlug: string) => Promise<{ ok: boolean; error?: string }>;
  pending: boolean;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(row.name);
  const [description, setDescription] = useState(row.description ?? "");
  const [badge, setBadge] = useState(row.badge ?? "");
  const [duration, setDuration] = useState(row.duration);
  const [route, setRoute] = useState(row.route ?? "");
  const [destinationSlug, setDestinationSlug] = useState(row.destination_slug);
  const [regionSlug, setRegionSlug] = useState(row.region_slug);
  const [related, setRelated] = useState<string[]>(row.related_destination_slugs ?? []);
  const [published, setPublished] = useState(row.published);
  const [metaTitle, setMetaTitle] = useState(row.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(row.meta_description ?? "");
  const [maxGroupSize, setMaxGroupSize] = useState<number | null>(row.max_group_size);
  const [languages, setLanguages] = useState<string[]>(row.languages ?? []);
  const [totalDistanceKm, setTotalDistanceKm] = useState<number | null>(row.total_distance_km);
  const [mealsPerPerson, setMealsPerPerson] = useState(row.meals_per_person ?? 0);
  const [entriesPerPerson, setEntriesPerPerson] = useState(row.entries_per_person ?? 0);
  const [destinationRank, setDestinationRank] = useState<Record<string, number>>(() => {
    const src = row.destination_rank ?? {};
    const out: Record<string, number> = {};
    for (const [k, v] of Object.entries(src)) {
      if (typeof v === "number") out[k] = v;
      else if (v && typeof v === "object" && typeof v.rank === "number") out[k] = v.rank;
    }
    return out;
  });
  const [relatedQuery, setRelatedQuery] = useState("");
  const rankSlugs = Array.from(new Set([destinationSlug, ...related].filter(Boolean)));
  const [childPctInput, setChildPctInput] = useState<string>(
    row.child_discount_pct != null ? String(Math.round(Number(row.child_discount_pct) * 100)) : ""
  );
  const [tiers, setTiers] = useState<Array<{ minAdults: number; pct: number }>>(
    row.group_discount_tiers ?? []
  );
  const [useCustomTiers, setUseCustomTiers] = useState<boolean>(
    row.group_discount_tiers != null && row.group_discount_tiers.length > 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <Field
          label="Slug (URL)"
          note="URL identifier used in /packages/{slug}. Renaming redirects old URLs but breaks any hardcoded external links."
        >
          <div className="flex items-center gap-2">
            <code className="px-3 py-1.5 rounded bg-[var(--bg-subtle)] text-[13px] text-[var(--text-primary)]">/{row.slug}</code>
            <button type="button" onClick={() => setRenameOpen(true)} className="h-8 px-3 text-[12px] font-semibold text-[var(--primary)] border border-[var(--primary)]/40 rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)]">
              Rename…
            </button>
          </div>
        </Field>
      </div>
      {renameOpen && (
        <RenameSlugModal
          currentSlug={row.slug}
          onClose={() => setRenameOpen(false)}
          onConfirm={onRenameSlug}
        />
      )}

      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Description">
        <AutoGrowTextarea value={description} onChange={(e) => setDescription(e.target.value)} minRows={4} />
      </Field>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Badge">
          <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="new | popular | bestseller | editors-pick" className={inputCls} />
        </Field>
        <Field label="Duration (days)">
          <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 1)} className={inputCls} />
        </Field>
        <Field label="Max group size (blank = default)">
          <input type="number" value={maxGroupSize ?? ""} onChange={(e) => setMaxGroupSize(e.target.value ? Number(e.target.value) : null)} className={inputCls} />
        </Field>
        <Field label="Published">
          <label className="inline-flex items-center gap-2 h-9">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            <span className="text-[13px]">Live on site</span>
          </label>
        </Field>
      </div>
      <Field
        label="Route (short description)"
        note="One-line route shown under the package name (e.g. 'Islamabad → Naran → Babusar → Hunza')."
      >
        <input value={route} onChange={(e) => setRoute(e.target.value)} className={inputCls} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Destination">
          <select value={destinationSlug} onChange={(e) => setDestinationSlug(e.target.value)} className={inputCls}>
            {destinationOptions.map((d) => (
              <option key={d.slug} value={d.slug}>{d.name} ({d.slug})</option>
            ))}
          </select>
        </Field>
        <Field label="Region">
          <select value={regionSlug} onChange={(e) => setRegionSlug(e.target.value)} className={inputCls}>
            {regionOptions.map((r) => (
              <option key={r.slug} value={r.slug}>{r.name} ({r.slug})</option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Related destinations (shown as tags on listings)"
        note="Adds this package to the listing pages for these destinations, in addition to the primary destination above."
      >
        <input
          value={relatedQuery}
          onChange={(e) => setRelatedQuery(e.target.value)}
          placeholder="Filter destinations…"
          className={inputCls}
        />
        <div className="mt-2 max-h-40 overflow-y-auto border border-[var(--border-default)] rounded-[var(--radius-sm)] p-2 space-y-1">
          {destinationOptions
            .filter((d) => d.slug !== destinationSlug && d.name.toLowerCase().includes(relatedQuery.toLowerCase()))
            .map((d) => {
              const on = related.includes(d.slug);
              return (
                <label key={d.slug} className="flex items-center gap-2 text-[12px]">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => setRelated((prev) => on ? prev.filter((s) => s !== d.slug) : [...prev, d.slug])}
                  />
                  <span>{d.name} <span className="text-[var(--text-tertiary)]">({d.slug})</span></span>
                </label>
              );
            })}
        </div>
      </Field>

      {rankSlugs.length > 0 && (
        <Field label="Ranking per destination (lower number ranks first)">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {rankSlugs.map((slug) => (
              <label key={slug} className="text-[12px] block">
                <span className="text-[var(--text-secondary)]">{slug}</span>
                <input
                  type="number"
                  value={destinationRank[slug] ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setDestinationRank((prev) => {
                      const next = { ...prev };
                      if (v === "") delete next[slug];
                      else next[slug] = Number(v);
                      return next;
                    });
                  }}
                  className="w-full h-8 px-2 border border-[var(--border-default)] rounded text-[12px] bg-[var(--bg-primary)] mt-0.5"
                />
              </label>
            ))}
          </div>
        </Field>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Field
          label="Total distance (km)"
          note="Total road km one-way + return. Jeep portions excluded (handled by jeep_legs). Drives fuel + rent cost in the engine."
        >
          <input type="number" value={totalDistanceKm ?? ""} onChange={(e) => setTotalDistanceKm(e.target.value ? Number(e.target.value) : null)} className={inputCls} />
        </Field>
        <Field
          label="Meals / person"
          note="PKR per person per day. Set 0 when hotels include all meals."
        >
          <input type="number" value={mealsPerPerson} onChange={(e) => setMealsPerPerson(Number(e.target.value) || 0)} className={inputCls} />
        </Field>
        <Field
          label="Entries / person"
          note="PKR per person, total for the whole trip (sum of all entry tickets)."
        >
          <input type="number" value={entriesPerPerson} onChange={(e) => setEntriesPerPerson(Number(e.target.value) || 0)} className={inputCls} />
        </Field>
      </div>

      <Field label="Languages">
        <StringList value={languages} onChange={setLanguages} placeholder="language" />
      </Field>

      <Field
        label="Meta title"
        note="Search-engine snippet title (Google, social share). Blank = auto-derived from package name."
      >
        <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputCls} />
      </Field>
      <Field
        label="Meta description"
        note="Search-engine snippet description (~150–160 chars ideal). Blank = auto-derived from package description."
      >
        <AutoGrowTextarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} minRows={2} />
      </Field>

      <div className="border-t border-[var(--border-default)] pt-4 space-y-4">
        <div>
          <div className="text-[13px] font-bold text-[var(--text-primary)]">Discounts (reserved — not yet applied)</div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            Editable here for planning; not yet wired into the package pricing engine. Leave blank / unchecked to keep behaviour unchanged.
          </p>
        </div>

        <Field label="Child discount % (ages 2–12) — blank = none">
          <input
            type="number"
            min={0}
            max={100}
            value={childPctInput}
            onChange={(e) => setChildPctInput(e.target.value)}
            placeholder=""
            className={inputCls}
          />
        </Field>

        <div>
          <label className="inline-flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              checked={useCustomTiers}
              onChange={(e) => setUseCustomTiers(e.target.checked)}
            />
            <span className="text-[13px] font-semibold">Use custom group-discount tiers</span>
          </label>
          <p className="text-[11px] text-[var(--text-tertiary)] mb-2">
            {useCustomTiers
              ? "Tiers below will be saved with this package (still not applied to pricing math)."
              : "No tiers saved. Tick above to define custom tiers."}
          </p>
          <div className={`space-y-2 ${useCustomTiers ? "" : "opacity-60"}`}>
            {tiers.map((t, i) => (
              <div key={i} className="flex items-end gap-2">
                <Field label="Min adults">
                  <input
                    type="number"
                    min={1}
                    value={t.minAdults}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[i] = { ...next[i], minAdults: Number(e.target.value) || 0 };
                      setTiers(next);
                    }}
                    className={inputCls}
                  />
                </Field>
                <Field label="% off adult fare">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={Math.round(t.pct * 100)}
                    onChange={(e) => {
                      const next = [...tiers];
                      next[i] = { ...next[i], pct: (Number(e.target.value) || 0) / 100 };
                      setTiers(next);
                    }}
                    className={inputCls}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => setTiers(tiers.filter((_, j) => j !== i))}
                  className="h-9 px-3 text-[12px] text-[var(--danger)] border border-[var(--danger)]/40 rounded-[var(--radius-sm)]"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setTiers([...tiers, { minAdults: (tiers.at(-1)?.minAdults ?? 3) + 3, pct: 0.05 }])}
              className="h-8 px-3 text-[12px] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)]/40 rounded-[var(--radius-sm)]"
            >
              + Add tier
            </button>
          </div>
        </div>
      </div>

      <SaveBar
        pending={pending}
        onSave={() => {
          const childPctNum = childPctInput.trim() === "" ? null : Number(childPctInput) / 100;
          const cleanTiers = [...tiers]
            .filter((t) => t.minAdults > 0)
            .sort((a, b) => a.minAdults - b.minAdults);
          const sortedTiers = useCustomTiers && cleanTiers.length > 0 ? cleanTiers : null;
          onSave({
            name,
            description,
            badge: badge || null,
            duration,
            route: route || null,
            destination_slug: destinationSlug,
            region_slug: regionSlug,
            related_destination_slugs: related,
            published,
            meta_title: metaTitle || null,
            meta_description: metaDescription || null,
            max_group_size: maxGroupSize,
            languages,
            total_distance_km: totalDistanceKm,
            meals_per_person: mealsPerPerson,
            entries_per_person: entriesPerPerson,
            destination_rank: destinationRank,
            child_discount_pct: childPctNum,
            group_discount_tiers: sortedTiers,
          });
        }}
      />
    </div>
  );
}

/* ============================ Gallery ============================ */

function GallerySection({ row, onSave, pending }: { row: PackageRow; onSave: (p: PackagePatch) => void; pending: boolean }) {
  const [images, setImages] = useState<GalleryImage[]>(row.images ?? []);
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[var(--text-tertiary)]">
        First image is the cover on listings + Open Graph. Uploads land in R2 at
        <code className="mx-1">packages/{row.slug}/</code>. DB order takes priority over R2 auto-listing.
      </p>
      <GalleryEditor tourSlug={row.slug} resourceKind="packages" images={images} onChange={setImages} />
      <SaveBar pending={pending} onSave={() => onSave({ images })} />
    </div>
  );
}

/* ============================ Content ============================ */

function ContentSection({ row, onSave, pending }: { row: PackageRow; onSave: (p: PackagePatch) => void; pending: boolean }) {
  const [blocks, setBlocks] = useState<TourBlock[]>((row.body_blocks as TourBlock[] | null) ?? []);
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[var(--text-tertiary)]">
        Rich body content shown below the description on the package page. Each block can carry a city visibility so it hides for travelers whose home isn&apos;t in the list. Preview under the Preview tab.
      </p>
      <BlockEditor tourSlug={row.slug} blocks={blocks} onChange={setBlocks} />
      <SaveBar pending={pending} onSave={() => onSave({ body_blocks: blocks })} />
    </div>
  );
}

/* ============================ Highlights + KBYG ============================ */

function HighlightsSection({ row, onSave, pending }: { row: PackageRow; onSave: (p: PackagePatch) => void; pending: boolean }) {
  const [highlights, setHighlights] = useState<string[]>(row.highlights ?? []);
  const [kbyg, setKbyg] = useState<string[]>(row.know_before_you_go ?? []);
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-2">Highlights</h2>
        <StringList value={highlights} onChange={setHighlights} placeholder="highlight" />
      </section>
      <section>
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-2">Know before you go</h2>
        <StringList value={kbyg} onChange={setKbyg} placeholder="note" />
      </section>
      <SaveBar pending={pending} onSave={() => onSave({ highlights, know_before_you_go: kbyg })} />
    </div>
  );
}

/* ============================ Inclusions / Exclusions ============================ */

function InclusionsSection({ row, onSave, pending }: { row: PackageRow; onSave: (p: PackagePatch) => void; pending: boolean }) {
  const [inclusions, setInclusions] = useState(row.inclusions);
  const [exclusions, setExclusions] = useState(row.exclusions);
  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-2">Included</h2>
        <CityAwareList value={inclusions} onChange={setInclusions} />
      </section>
      <section>
        <h2 className="text-[15px] font-bold text-[var(--text-primary)] mb-2">Not included</h2>
        <CityAwareList value={exclusions} onChange={setExclusions} />
      </section>
      <SaveBar pending={pending} onSave={() => onSave({ inclusions, exclusions })} />
    </div>
  );
}

/* ============================ Pricing ============================ */

// Preserves the exact `pricing` shape the pricing engine expects — one
// TierPricing per tier (deluxe / luxury) with per-city prices + single supp.
// This tab only re-lays out the existing form; math is unchanged.
function PricingSection({ row, onSave, onReprice, pending }: { row: PackageRow; onSave: (p: PackagePatch) => void; onReprice: () => Promise<void>; pending: boolean }) {
  const router = useRouter();
  // DB rows may still carry lowercase-name keys (`islamabad`) during the
  // rollout window. Prefer the code key when present, fall back to the name
  // for backward-compatibility. New writes always use codes.
  //
  // Non-city extras (`singleSupplement`) live on the same tier object and
  // must be preserved on save. Kept in a ref so we can round-trip them
  // through the form without exposing extra inputs.
  type TierRaw = Partial<TierPricing> & {
    islamabad?: number | null;
    lahore?: number | null;
    karachi?: number | null;
    singleSupplement?: number | null;
  };
  const raw = row.pricing as { deluxe?: TierRaw; luxury?: TierRaw } | null;
  const readTier = (t: TierRaw | undefined): TierPricing => ({
    ISB: t?.ISB ?? t?.islamabad ?? null,
    LHE: t?.LHE ?? t?.lahore ?? null,
    KHI: t?.KHI ?? t?.karachi ?? null,
  });
  const extrasDeluxeRef = useRef<Record<string, unknown>>({});
  const extrasLuxuryRef = useRef<Record<string, unknown>>({});
  const captureExtras = (t: TierRaw | undefined): Record<string, unknown> => {
    if (!t) return {};
    const drop = new Set(["ISB", "LHE", "KHI", "islamabad", "lahore", "karachi"]);
    return Object.fromEntries(Object.entries(t).filter(([k]) => !drop.has(k)));
  };
  const [deluxe, setDeluxe] = useState<TierPricing>(() => {
    extrasDeluxeRef.current = captureExtras(raw?.deluxe);
    return readTier(raw?.deluxe);
  });
  const [luxury, setLuxury] = useState<TierPricing>(() => {
    extrasLuxuryRef.current = captureExtras(raw?.luxury);
    return readTier(raw?.luxury);
  });
  // Sync local state when server row updates (e.g. after reprice + router.refresh).
  useEffect(() => {
    extrasDeluxeRef.current = captureExtras(raw?.deluxe);
    extrasLuxuryRef.current = captureExtras(raw?.luxury);
    setDeluxe(readTier(raw?.deluxe));
    setLuxury(readTier(raw?.luxury));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [row.pricing]);
  const [startingCities, setStartingCities] = useState<Home[]>(
    (row.starting_cities ?? []).filter((c): c is Home => CITY_KEYS.includes(c as Home)),
  );

  function TierGrid({ label, value, onChange }: { label: string; value: TierPricing; onChange: (v: TierPricing) => void }) {
    return (
      <fieldset className="border border-[var(--border-default)] rounded-[var(--radius-sm)] p-4 space-y-3">
        <legend className="px-2 text-[13px] font-bold text-[var(--text-primary)]">{label}</legend>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {([
            { code: "ISB", label: "Islamabad" },
            { code: "LHE", label: "Lahore" },
            { code: "KHI", label: "Karachi" },
          ] as const).map(({ code, label }) => (
            <label key={code} className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">
                {label}
              </span>
              <input
                type="number"
                value={value[code] ?? ""}
                onChange={(e) => onChange({ ...value, [code]: e.target.value ? Number(e.target.value) : null })}
                className={inputCls}
                placeholder={value[code] != null ? formatPrice(value[code]!) : "—"}
              />
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  // Merge captured extras (singleSupplement, etc.) back onto each tier so the
  // save doesn't drop them. Extras with the same key as a rate field would be
  // overwritten by the form values — the captureExtras filter above prevents
  // that from being possible.
  const pricing: PackagePricing = {
    deluxe: { ...extrasDeluxeRef.current, ...deluxe } as PackagePricing["deluxe"],
    luxury: { ...extrasLuxuryRef.current, ...luxury } as PackagePricing["luxury"],
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-[12px] text-[var(--text-tertiary)] max-w-xl">
          Snapshot prices the customer sees. Engine recomputes these from hotels + fuel + margin — click Reprice from engine to refresh.
        </p>
        <button
          type="button"
          onClick={async () => {
            await onReprice();
            router.refresh();
          }}
          disabled={pending}
          className="h-9 px-3 text-[12px] font-semibold text-[var(--primary)] border border-[var(--primary)]/40 rounded-[var(--radius-sm)] hover:bg-[var(--primary)]/5 disabled:opacity-50"
        >
          {pending ? "Repricing…" : "Reprice from engine"}
        </button>
      </div>
      <Field label="Starting cities (which home cities this package is offered to)">
        <CityChips value={startingCities} onChange={(next) => setStartingCities((next ?? []) as Home[])} />
      </Field>
      <TierGrid label="Deluxe tier" value={deluxe} onChange={setDeluxe} />
      <TierGrid label="Luxury tier" value={luxury} onChange={setLuxury} />
      <SaveBar
        pending={pending}
        onSave={() => onSave({ pricing, starting_cities: startingCities })}
      />
    </div>
  );
}

/* ============================ Addons ============================ */

function AddonsSection({
  packageSlug,
  initialAddons,
  actions,
  pending,
  announce,
  startTransition,
}: {
  packageSlug: string;
  initialAddons: PackageAddonRow[];
  actions: Actions;
  pending: boolean;
  announce: (ok: boolean, msg: string) => void;
  startTransition: React.TransitionStartFunction;
}) {
  const [addons, setAddons] = useState(initialAddons);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function updateAddon(i: number, patch: Partial<PackageAddonRow>) {
    setAddons((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  function saveAddon(a: PackageAddonRow) {
    startTransition(async () => {
      const r = await actions.upsertPackageAddon({
        id: a.id || undefined,
        package_slug: packageSlug,
        type: a.type,
        label: a.label,
        applies_to_departures: a.applies_to_departures,
        group_key: a.group_key,
        is_required: a.is_required,
        default_selected: a.default_selected,
        duration_delta: a.duration_delta,
        priority: a.priority,
        config: a.config,
      });
      if (r.ok && r.id && !a.id) {
        setAddons((prev) => prev.map((x) => (x === a ? { ...x, id: r.id! } : x)));
      }
      announce(r.ok, r.ok ? "Addon saved" : r.error ?? "Save failed");
    });
  }
  function removeAddon(i: number) {
    const a = addons[i];
    if (!confirm(`Delete "${a.label}"?`)) return;
    if (a.id) {
      startTransition(async () => {
        const r = await actions.deletePackageAddon(a.id, packageSlug);
        if (r.ok) setAddons((prev) => prev.filter((_, idx) => idx !== i));
        announce(r.ok, r.ok ? "Addon deleted" : r.error ?? "Delete failed");
      });
    } else {
      setAddons((prev) => prev.filter((_, idx) => idx !== i));
    }
  }
  function addAddon() {
    const blank: PackageAddonRow = {
      id: "",
      package_slug: packageSlug,
      type: "custom",
      label: "New addon",
      applies_to_departures: ["ISB"],
      group_key: null,
      is_required: false,
      default_selected: false,
      duration_delta: 0,
      priority: 100,
      config: { farePerPerson: 0 },
      created_at: null,
      updated_at: null,
    };
    setAddons((prev) => [...prev, blank]);
    setEditingIdx(addons.length);
  }

  return (
    <div className="space-y-3">
      {addons.map((a, i) => (
        <div key={a.id || `new-${i}`} className="border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                {a.label} <span className="text-[11px] text-[var(--text-tertiary)] font-normal">[{a.type}]</span>
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">
                Applies to: {a.applies_to_departures.join(", ") || "—"}
                {" · "}{a.is_required ? "Required" : `Optional (${a.default_selected ? "default on" : "default off"})`}
                {a.group_key ? ` · group: ${a.group_key}` : ""}
                {a.duration_delta ? ` · +${a.duration_delta}d` : ""}
              </div>
            </div>
            <button type="button" onClick={() => setEditingIdx(editingIdx === i ? null : i)} className="text-[12px] font-semibold text-[var(--primary)] hover:underline">
              {editingIdx === i ? "Close" : "Edit"}
            </button>
            <button type="button" onClick={() => removeAddon(i)} className="text-[12px] font-semibold text-[var(--error)] hover:underline">Delete</button>
          </div>

          {editingIdx === i && (
            <div className="mt-3 space-y-3 border-t border-[var(--border-default)] pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Type">
                  <select value={a.type} onChange={(e) => updateAddon(i, { type: e.target.value as AddonType, config: {} })} className={inputCls}>
                    {ADDON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Label">
                  <input value={a.label} onChange={(e) => updateAddon(i, { label: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Applies to departures</div>
                <CityChips
                  value={a.applies_to_departures as Home[]}
                  onChange={(next) => updateAddon(i, { applies_to_departures: next ?? [] })}
                />
                <div className="text-[11px] text-[var(--text-tertiary)] mt-1">Empty = disabled. Pick at least one city.</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={a.is_required} onChange={(e) => updateAddon(i, { is_required: e.target.checked })} />
                    <span className="text-[13px]">Required (auto-included, non-toggleable)</span>
                  </label>
                  <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Charged automatically when the addon&apos;s departure conditions match. Customer can&apos;t opt out.</p>
                </div>
                {!a.is_required && (
                  <div>
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={a.default_selected} onChange={(e) => updateAddon(i, { default_selected: e.target.checked })} />
                      <span className="text-[13px]">Default checked in Extras</span>
                    </label>
                    <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Pre-ticked in the wizard&apos;s Extras step; customer can uncheck.</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field
                  label="Group key (radio)"
                  note="Addons sharing the same group key are mutually exclusive — engine picks the highest-priority match (e.g. 'flight-primary' for competing ISB vs KHI flights)."
                >
                  <input value={a.group_key ?? ""} onChange={(e) => updateAddon(i, { group_key: e.target.value || null })} placeholder="e.g. hotel-pre-tour" className={inputCls} />
                </Field>
                <Field
                  label="Priority"
                  note="Higher wins within the same group. Ties broken by insertion order."
                >
                  <input type="number" value={a.priority} onChange={(e) => updateAddon(i, { priority: Number(e.target.value) || 0 })} className={inputCls} />
                </Field>
                <Field
                  label="Duration delta (days)"
                  note="Extra days added to trip length when this addon applies (e.g. +2 for KHI travelers needing an ISB overnight each way)."
                >
                  <input type="number" value={a.duration_delta} onChange={(e) => updateAddon(i, { duration_delta: Number(e.target.value) || 0 })} className={inputCls} />
                </Field>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-2">Config</div>
                <AddonConfigForm
                  type={a.type as AddonType}
                  config={a.config as Record<string, unknown>}
                  onChange={(next) => updateAddon(i, { config: next })}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => saveAddon(a)}
                  className="h-9 px-4 text-[13px] font-semibold bg-[var(--primary)] text-[var(--text-inverse)] rounded-[var(--radius-sm)] disabled:opacity-60"
                >
                  {pending ? "Saving…" : a.id ? "Save addon" : "Create addon"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addAddon}
        className="h-9 px-3 text-[12px] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)]/40 rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)]"
      >
        + Add addon
      </button>
    </div>
  );
}

/* ============================ Preview ============================ */

function PreviewSection({ packageSlug, startingCities }: { packageSlug: string; startingCities: Home[] }) {
  const initialCity: Home = (startingCities?.[0] as Home) ?? "ISB";
  const [city, setCity] = useState<Home>(initialCity);
  const [tier, setTier] = useState<"deluxe" | "luxury">("deluxe");
  const src = `/packages/${packageSlug}?preview=${city}&previewTier=${tier}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] text-[var(--text-secondary)]">From:</span>
            {CITY_KEYS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={city === c ? chipActive : chip}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] text-[var(--text-secondary)]">Tier:</span>
            {(["deluxe", "luxury"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={tier === t ? chipActive : chip}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <a href={src} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-[var(--primary)] hover:underline">
          Open in new tab ↗
        </a>
      </div>
      <div className="border border-[var(--border-default)] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--bg-primary)]" style={{ height: "80vh" }}>
        <iframe key={`${city}-${tier}`} src={src} title={`Preview ${packageSlug} as ${city} ${tier}`} className="w-full h-full" />
      </div>
    </div>
  );
}

/* ============================ Rename slug modal ============================ */

function RenameSlugModal({
  currentSlug,
  onClose,
  onConfirm,
}: {
  currentSlug: string;
  onClose: () => void;
  onConfirm: (newSlug: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [newSlug, setNewSlug] = useState(currentSlug);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changed = newSlug !== currentSlug && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(newSlug);

  async function submit() {
    setError(null);
    setPending(true);
    const r = await onConfirm(newSlug);
    if (!r.ok) {
      setError(r.error ?? "Rename failed");
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-primary)] rounded-[var(--radius-md)] p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Rename slug</h2>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Updates the URL for this package and cascades to itinerary + addon rows. Only rename if the package hasn&apos;t been shared — the old URL will 404 otherwise.
        </p>
        {error && <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-[13px]">{error}</div>}
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">Current</span>
          <code className="block px-3 py-2 rounded bg-[var(--bg-subtle)] text-[13px] text-[var(--text-primary)]">/{currentSlug}</code>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">New slug</span>
          <input
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="lowercase-kebab-case"
            className="w-full h-10 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[13px] bg-[var(--bg-primary)]"
          />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-9 px-4 text-[13px] font-semibold text-[var(--text-secondary)] rounded hover:bg-[var(--bg-subtle)]">
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !changed}
            onClick={submit}
            className="h-9 px-4 text-[13px] font-semibold bg-[var(--primary)] text-[var(--text-inverse)] rounded-[var(--radius-sm)] disabled:opacity-60"
          >
            {pending ? "Renaming…" : "Rename"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================ Shared ============================ */

const inputCls = "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px]";
const chip = "h-7 px-2.5 rounded-full text-[11px] font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--primary)]";
const chipActive = "h-7 px-2.5 rounded-full text-[11px] font-semibold border border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]";

function Field({ label, children, note }: { label: string; children: React.ReactNode; note?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">{label}</span>
      {children}
      {note && <p className="text-[11px] text-[var(--text-tertiary)] mt-1">{note}</p>}
    </label>
  );
}

function SaveBar({ pending, onSave }: { pending: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-3 border-t border-[var(--border-default)]">
      <button
        type="button"
        disabled={pending}
        onClick={onSave}
        className="h-10 px-4 text-[13px] font-semibold bg-[var(--primary)] text-[var(--text-inverse)] rounded-[var(--radius-sm)] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}
