"use client";

import { useState, useTransition } from "react";
import type { TourRow, TourItineraryDayRow, TourAddonRow, DepartureRow } from "@/lib/supabase/types";
import type { AddonType } from "@/types/tour-addon";
import type { TourPatch, ItineraryDayPatch, TourAddonPatch, DeparturePatch } from "@/app/admin/tours/actions";
import { formatPrice } from "@/lib/utils";
import { StringList } from "./tour-editor/StringList";
import { CityAwareList } from "./tour-editor/CityAwareList";
import { CityChips } from "./tour-editor/CityChips";
import { AddonConfigForm } from "./tour-editor/AddonConfigForm";
import { GalleryEditor, type GalleryImage } from "./tour-editor/GalleryEditor";
import { BlockEditor } from "./tour-editor/BlockEditor";
import type { TourBlock } from "@/types/tour-block";

type Home = "ISB" | "LHE" | "KHI" | "KDU";

const ADDON_TYPES: AddonType[] = ["flight", "bus", "hotel", "meal", "activity", "transfer", "insurance", "custom"];

interface Actions {
  updateTour: (slug: string, patch: TourPatch) => Promise<{ ok: boolean; error?: string }>;
  upsertItineraryDay: (day: ItineraryDayPatch) => Promise<{ ok: boolean; id?: string; error?: string }>;
  deleteItineraryDay: (id: string, tourSlug: string) => Promise<{ ok: boolean; error?: string }>;
  upsertTourAddon: (addon: TourAddonPatch) => Promise<{ ok: boolean; id?: string; error?: string }>;
  deleteTourAddon: (id: string, tourSlug: string) => Promise<{ ok: boolean; error?: string }>;
  upsertDeparture: (row: DeparturePatch) => Promise<{ ok: boolean; id?: string; error?: string }>;
  deleteDeparture: (id: string, tourSlug: string) => Promise<{ ok: boolean; error?: string }>;
  renameTourSlug: (oldSlug: string, newSlug: string) => Promise<{ ok: boolean; slug?: string; error?: string } | void>;
}

const TABS = ["Basics", "Gallery", "Content", "Highlights", "Inclusions", "Meeting Point", "Itinerary", "Addons", "Departures", "Preview"] as const;

export function TourEditor({
  tour,
  days,
  addons,
  departures,
  actions,
}: {
  tour: TourRow;
  days: TourItineraryDayRow[];
  addons: TourAddonRow[];
  departures: DepartureRow[];
  actions: Actions;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Basics");
  const [pending, startTransition] = useTransition();
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function announce(ok: boolean, msg: string) {
    if (ok) { setFlash(msg); setError(null); setTimeout(() => setFlash(null), 2000); }
    else { setError(msg); setFlash(null); }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{tour.name}</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">/{tour.slug}</p>
        </div>
        <a href={`/grouptours/${tour.slug}`} target="_blank" rel="noreferrer" className="text-[13px] font-semibold text-[var(--primary)] hover:underline">
          View live ↗
        </a>
      </header>

      <nav className="flex flex-wrap gap-1 border-b border-[var(--border-default)]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
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

      {tab === "Basics" && (
        <BasicsSection
          tour={tour}
          onSave={(patch) => startTransition(async () => {
            const r = await actions.updateTour(tour.slug, patch);
            announce(r.ok, r.ok ? "Saved" : r.error ?? "Failed");
          })}
          onRenameSlug={(newSlug) => new Promise((resolve) => {
            startTransition(async () => {
              const r = await actions.renameTourSlug(tour.slug, newSlug);
              // If the server redirected (rename succeeded), we never get here.
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
        <GallerySection tour={tour} onSave={(patch) => startTransition(async () => {
          const r = await actions.updateTour(tour.slug, patch);
          announce(r.ok, r.ok ? "Saved" : r.error ?? "Failed");
        })} pending={pending} />
      )}
      {tab === "Content" && (
        <ContentSection tour={tour} onSave={(patch) => startTransition(async () => {
          const r = await actions.updateTour(tour.slug, patch);
          announce(r.ok, r.ok ? "Saved" : r.error ?? "Failed");
        })} pending={pending} />
      )}
      {tab === "Highlights" && (
        <HighlightsSection tour={tour} onSave={(patch) => startTransition(async () => {
          const r = await actions.updateTour(tour.slug, patch);
          announce(r.ok, r.ok ? "Saved" : r.error ?? "Failed");
        })} pending={pending} />
      )}
      {tab === "Inclusions" && (
        <InclusionsSection tour={tour} onSave={(patch) => startTransition(async () => {
          const r = await actions.updateTour(tour.slug, patch);
          announce(r.ok, r.ok ? "Saved" : r.error ?? "Failed");
        })} pending={pending} />
      )}
      {tab === "Meeting Point" && (
        <MeetingPointSection tour={tour} onSave={(patch) => startTransition(async () => {
          const r = await actions.updateTour(tour.slug, patch);
          announce(r.ok, r.ok ? "Saved" : r.error ?? "Failed");
        })} pending={pending} />
      )}
      {tab === "Itinerary" && (
        <ItinerarySection
          tourSlug={tour.slug}
          initialDays={days}
          actions={actions}
          pending={pending}
          announce={announce}
          startTransition={startTransition}
        />
      )}
      {tab === "Addons" && (
        <AddonsSection
          tourSlug={tour.slug}
          initialAddons={addons}
          actions={actions}
          pending={pending}
          announce={announce}
          startTransition={startTransition}
        />
      )}
      {tab === "Departures" && (
        <DeparturesSection
          tourSlug={tour.slug}
          duration={tour.duration}
          initialDepartures={departures}
          actions={actions}
          pending={pending}
          announce={announce}
          startTransition={startTransition}
        />
      )}
      {tab === "Preview" && (
        <PreviewSection tourSlug={tour.slug} anchorCity={tour.anchor_city as Home | null} />
      )}
    </div>
  );
}

/* ============================ Basics ============================ */

function BasicsSection({
  tour,
  onSave,
  onRenameSlug,
  pending,
}: {
  tour: TourRow;
  onSave: (p: TourPatch) => void;
  onRenameSlug: (newSlug: string) => Promise<{ ok: boolean; error?: string }>;
  pending: boolean;
}) {
  const [renameOpen, setRenameOpen] = useState(false);
  const [name, setName] = useState(tour.name);
  const [description, setDescription] = useState(tour.description);
  const [category, setCategory] = useState(tour.category);
  const [duration, setDuration] = useState(tour.duration);
  const [route, setRoute] = useState(tour.route ?? "");
  const [maxGroupSize, setMaxGroupSize] = useState(tour.max_group_size);
  const [minAge, setMinAge] = useState<number | null>(tour.min_age);
  const [anchorCity, setAnchorCity] = useState<Home | null>((tour.anchor_city as Home | null) ?? null);
  const [badge, setBadge] = useState(tour.badge ?? "");
  const [metaTitle, setMetaTitle] = useState(tour.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(tour.meta_description ?? "");
  const [featured, setFeatured] = useState(tour.featured);
  const [childPctInput, setChildPctInput] = useState<string>(
    tour.child_discount_pct != null ? String(Math.round(Number(tour.child_discount_pct) * 100)) : ""
  );
  const initialTiers = (tour.group_discount_tiers && tour.group_discount_tiers.length > 0)
    ? tour.group_discount_tiers
    : [{ minAdults: 3, pct: 0.05 }, { minAdults: 6, pct: 0.1 }];
  const [tiers, setTiers] = useState<Array<{ minAdults: number; pct: number }>>(initialTiers);
  const [useCustomTiers, setUseCustomTiers] = useState<boolean>(
    tour.group_discount_tiers != null && tour.group_discount_tiers.length > 0
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <Field label="Slug (URL)">
          <div className="flex items-center gap-2">
            <code className="px-3 py-1.5 rounded bg-[var(--bg-subtle)] text-[13px] text-[var(--text-primary)]">/{tour.slug}</code>
            <button
              type="button"
              onClick={() => setRenameOpen(true)}
              className="h-8 px-3 text-[12px] font-semibold text-[var(--primary)] border border-[var(--primary)]/40 rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)]"
            >
              Rename…
            </button>
          </div>
        </Field>
      </div>
      {renameOpen && (
        <RenameSlugModal
          currentSlug={tour.slug}
          onClose={() => setRenameOpen(false)}
          onConfirm={onRenameSlug}
        />
      )}
      <Field label="Name">
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Category">
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Duration (days)">
          <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value) || 0)} className={inputCls} />
        </Field>
        <Field label="Max group size">
          <input type="number" value={maxGroupSize} onChange={(e) => setMaxGroupSize(Number(e.target.value) || 0)} className={inputCls} />
        </Field>
        <Field label="Min age (blank = any)">
          <input type="number" value={minAge ?? ""} onChange={(e) => setMinAge(e.target.value ? Number(e.target.value) : null)} className={inputCls} />
        </Field>
      </div>
      <Field label="Route (short description)">
        <input value={route} onChange={(e) => setRoute(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Anchor city (city that pays base with no transport addon)">
        <div className="flex flex-wrap gap-1.5">
          <button type="button" onClick={() => setAnchorCity(null)} className={anchorCity === null ? chipActive : chip}>None</button>
          {(["ISB", "LHE", "KHI", "KDU"] as Home[]).map((c) => (
            <button key={c} type="button" onClick={() => setAnchorCity(c)} className={anchorCity === c ? chipActive : chip}>{c}</button>
          ))}
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Badge">
          <input value={badge} onChange={(e) => setBadge(e.target.value)} placeholder="on-sale | epic-trek | bestseller | new" className={inputCls} />
        </Field>
        <Field label="Featured on home">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            <span className="text-[13px]">Featured</span>
          </label>
        </Field>
      </div>
      <Field label="Meta title">
        <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} className={inputCls} />
      </Field>
      <Field label="Meta description">
        <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={2} className={inputCls} />
      </Field>

      <div className="border-t border-[var(--border-default)] pt-4 space-y-4">
        <div>
          <div className="text-[13px] font-bold text-[var(--text-primary)]">Discounts (applied to base fare)</div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
            Leave child field blank to use the site default (50%). Turn off custom tiers to fall back to 3 adults → 5%, 6 adults → 10%.
          </p>
        </div>

        <Field label="Child discount % (ages 2–12) — blank = default 50%">
          <input
            type="number"
            min={0}
            max={100}
            value={childPctInput}
            onChange={(e) => setChildPctInput(e.target.value)}
            placeholder="50"
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
              ? "Applied to the adults subtotal only."
              : "Site default active (3 adults → 5%, 6 adults → 10%). Tick above to use the custom tiers below."}
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
            category,
            duration,
            route,
            max_group_size: maxGroupSize,
            min_age: minAge,
            anchor_city: anchorCity,
            badge: badge || null,
            meta_title: metaTitle,
            meta_description: metaDescription,
            featured,
            child_discount_pct: childPctNum,
            group_discount_tiers: sortedTiers,
          });
        }}
      />
    </div>
  );
}

/* ============================ Highlights ============================ */

/* ============================ Gallery ============================ */

function GallerySection({ tour, onSave, pending }: { tour: TourRow; onSave: (p: TourPatch) => void; pending: boolean }) {
  const [images, setImages] = useState<GalleryImage[]>(tour.images ?? []);
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[var(--text-tertiary)]">
        First image is the cover on listings + Open Graph. Reorder with ↑ / ↓. Uploads land in R2 at
        <code className="mx-1">tours/{tour.slug}/</code>. Save persists the order to the DB (which takes priority over R2 auto-listing).
      </p>
      <GalleryEditor tourSlug={tour.slug} images={images} onChange={setImages} />
      <SaveBar pending={pending} onSave={() => onSave({ images })} />
    </div>
  );
}

/* ============================ Content (Block editor) ============================ */

function ContentSection({ tour, onSave, pending }: { tour: TourRow; onSave: (p: TourPatch) => void; pending: boolean }) {
  const [blocks, setBlocks] = useState<TourBlock[]>((tour.body_blocks as TourBlock[] | null) ?? []);
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[var(--text-tertiary)]">
        Rich body content shown below the description on the tour page. Each block can carry a city visibility
        so it hides for travelers whose home isn&apos;t in the list. Preview under the Preview tab.
      </p>
      <BlockEditor tourSlug={tour.slug} blocks={blocks} onChange={setBlocks} />
      <SaveBar pending={pending} onSave={() => onSave({ body_blocks: blocks })} />
    </div>
  );
}

function HighlightsSection({ tour, onSave, pending }: { tour: TourRow; onSave: (p: TourPatch) => void; pending: boolean }) {
  const [highlights, setHighlights] = useState<string[]>(tour.highlights);
  const [kbyg, setKbyg] = useState<string[]>(tour.know_before_you_go);
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

function InclusionsSection({ tour, onSave, pending }: { tour: TourRow; onSave: (p: TourPatch) => void; pending: boolean }) {
  const [inclusions, setInclusions] = useState(tour.inclusions);
  const [exclusions, setExclusions] = useState(tour.exclusions);
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

/* ============================ Meeting Point ============================ */

function MeetingPointSection({ tour, onSave, pending }: { tour: TourRow; onSave: (p: TourPatch) => void; pending: boolean }) {
  const [m, setM] = useState(tour.meeting_point);
  const set = (patch: Partial<typeof m>) => setM({ ...m, ...patch });
  return (
    <div className="space-y-4">
      <Field label="Address">
        <input value={m.address} onChange={(e) => set({ address: e.target.value })} className={inputCls} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Departure time">
          <input value={m.departureTime} onChange={(e) => set({ departureTime: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Arrival instruction">
          <input value={m.arrivalInstruction} onChange={(e) => set({ arrivalInstruction: e.target.value })} className={inputCls} />
        </Field>
      </div>
      <Field label="End point">
        <input value={m.endPoint} onChange={(e) => set({ endPoint: e.target.value })} className={inputCls} />
      </Field>
      <label className="inline-flex items-center gap-2">
        <input type="checkbox" checked={m.pickupOffered} onChange={(e) => set({ pickupOffered: e.target.checked })} />
        <span className="text-[13px]">Pickup offered</span>
      </label>
      {m.pickupOffered && (
        <Field label="Pickup description">
          <textarea value={m.pickupDescription} onChange={(e) => set({ pickupDescription: e.target.value })} rows={2} className={inputCls} />
        </Field>
      )}
      <SaveBar pending={pending} onSave={() => onSave({ meeting_point: m })} />
    </div>
  );
}

/* ============================ Itinerary ============================ */

function ItinerarySection({
  tourSlug,
  initialDays,
  actions,
  pending,
  announce,
  startTransition,
}: {
  tourSlug: string;
  initialDays: TourItineraryDayRow[];
  actions: Actions;
  pending: boolean;
  announce: (ok: boolean, msg: string) => void;
  startTransition: React.TransitionStartFunction;
}) {
  const [days, setDays] = useState(initialDays);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function updateDay(i: number, patch: Partial<TourItineraryDayRow>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function saveDay(day: TourItineraryDayRow) {
    startTransition(async () => {
      const r = await actions.upsertItineraryDay({
        id: day.id || undefined,
        tour_slug: tourSlug,
        day_number: day.day_number,
        title: day.title,
        description: day.description,
        image: day.image,
        stops: day.stops,
        driving_time: day.driving_time,
        overnight: day.overnight,
        city_only: day.city_only,
      });
      if (r.ok && r.id && !day.id) {
        setDays((prev) => prev.map((d) => (d === day ? { ...d, id: r.id! } : d)));
      }
      announce(r.ok, r.ok ? `Day ${day.day_number} saved` : r.error ?? "Save failed");
    });
  }

  function removeDay(i: number) {
    const day = days[i];
    if (!confirm(`Delete Day ${day.day_number}?`)) return;
    if (day.id) {
      startTransition(async () => {
        const r = await actions.deleteItineraryDay(day.id, tourSlug);
        if (r.ok) setDays((prev) => prev.filter((_, idx) => idx !== i));
        announce(r.ok, r.ok ? "Day deleted" : r.error ?? "Delete failed");
      });
    } else {
      setDays((prev) => prev.filter((_, idx) => idx !== i));
    }
  }

  function addDay() {
    // Leave day_number unset (NaN sentinel → empty input) so admin explicitly
    // picks the number. Save button refuses NaN.
    const blank: TourItineraryDayRow = {
      id: "",
      tour_slug: tourSlug,
      day_number: Number.NaN,
      title: "",
      description: "",
      image: null,
      stops: [],
      driving_time: "",
      overnight: "",
      city_only: null,
    };
    setDays((prev) => [...prev, blank]);
    setEditingIdx(days.length);
  }

  return (
    <div className="space-y-3">
      {days.map((d, i) => (
        <div key={d.id || `new-${i}`} className="border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                Day {Number.isFinite(d.day_number) ? d.day_number : "?"} — {d.title || "(untitled)"}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)]">
                {d.overnight ? `Overnight: ${d.overnight}` : "No overnight set"}
                {d.city_only && d.city_only.length > 0 ? ` · Only for ${d.city_only.join("/")}` : ""}
              </div>
            </div>
            <button type="button" onClick={() => setEditingIdx(editingIdx === i ? null : i)} className="text-[12px] font-semibold text-[var(--primary)] hover:underline">
              {editingIdx === i ? "Close" : "Edit"}
            </button>
            <button type="button" onClick={() => removeDay(i)} className="text-[12px] font-semibold text-[var(--error)] hover:underline">Delete</button>
          </div>

          {editingIdx === i && (
            <div className="mt-3 space-y-3 border-t border-[var(--border-default)] pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Day number">
                  <input
                    type="number"
                    value={Number.isFinite(d.day_number) ? d.day_number : ""}
                    placeholder="e.g. 0"
                    onChange={(e) => {
                      const raw = e.target.value;
                      // Empty string → NaN sentinel so the input stays blank
                      // and Save refuses. Any parsable number (including 0
                      // and negatives) round-trips.
                      updateDay(i, { day_number: raw === "" ? Number.NaN : Number(raw) });
                    }}
                    className={inputCls}
                  />
                </Field>
                <Field label="Title">
                  <input value={d.title} onChange={(e) => updateDay(i, { title: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label="Description">
                <textarea value={d.description} onChange={(e) => updateDay(i, { description: e.target.value })} rows={10} className={inputCls} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Driving time">
                  <input value={d.driving_time} onChange={(e) => updateDay(i, { driving_time: e.target.value })} className={inputCls} />
                </Field>
                <Field label="Overnight">
                  <input value={d.overnight} onChange={(e) => updateDay(i, { overnight: e.target.value })} className={inputCls} />
                </Field>
              </div>
              <Field label="Image URL (optional)">
                <input
                  value={d.image?.url ?? ""}
                  onChange={(e) => updateDay(i, { image: e.target.value ? { url: e.target.value, alt: d.image?.alt ?? d.title } : null })}
                  className={inputCls}
                />
              </Field>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Day visible for</div>
                <CityChips
                  value={d.city_only as Home[] | null | undefined}
                  onChange={(next) => updateDay(i, { city_only: next ?? null })}
                />
              </div>
              <StopsEditor
                stops={d.stops}
                onChange={(next) => updateDay(i, { stops: next })}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={pending || !Number.isFinite(d.day_number)}
                  onClick={() => saveDay(d)}
                  className="h-9 px-4 text-[13px] font-semibold bg-[var(--primary)] text-[var(--text-inverse)] rounded-[var(--radius-sm)] disabled:opacity-60"
                >
                  {pending ? "Saving…" : d.id ? "Save day" : "Create day"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addDay}
        className="h-9 px-3 text-[12px] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)]/40 rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)]"
      >
        + Add day
      </button>
    </div>
  );
}

type Stop = { name: string; detail: string; cityOnly?: string };

const STOP_CITY_OPTIONS = ["", "islamabad", "lahore", "karachi", "skardu"] as const;

function StopsEditor({ stops, onChange }: { stops: Stop[]; onChange: (next: Stop[]) => void }) {
  const update = (i: number, patch: Partial<Stop>) => {
    const next = stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
    onChange(next);
  };
  const remove = (i: number) => onChange(stops.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= stops.length) return;
    const next = [...stops];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] mb-1">Stops</div>
      <p className="text-[11px] text-[var(--text-tertiary)] mb-2">
        Sub-locations shown as bullets under the day. Pick a city if a stop is only relevant to that departure.
      </p>
      <div className="space-y-2">
        {stops.map((s, i) => (
          <div key={i} className="border border-[var(--border-default)] rounded-[var(--radius-sm)] p-2 space-y-2 bg-[var(--bg-primary)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Field label="Name">
                <input value={s.name} onChange={(e) => update(i, { name: e.target.value })} className={inputCls} placeholder="e.g. Attabad Lake" />
              </Field>
              <Field label="Detail">
                <input value={s.detail} onChange={(e) => update(i, { detail: e.target.value })} className={inputCls} placeholder="e.g. 20-min photo stop" />
              </Field>
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <Field label="Only for city">
                <select
                  value={s.cityOnly ?? ""}
                  onChange={(e) => update(i, { cityOnly: e.target.value || undefined })}
                  className={inputCls}
                >
                  {STOP_CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c === "" ? "All cities" : c}</option>
                  ))}
                </select>
              </Field>
              <div className="ml-auto flex items-center gap-1">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="h-8 px-2 text-[12px] border border-[var(--border-default)] rounded-[var(--radius-sm)] disabled:opacity-40">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === stops.length - 1} className="h-8 px-2 text-[12px] border border-[var(--border-default)] rounded-[var(--radius-sm)] disabled:opacity-40">↓</button>
                <button type="button" onClick={() => remove(i)} className="h-8 px-3 text-[12px] text-[var(--danger)] border border-[var(--danger)]/40 rounded-[var(--radius-sm)]">Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...stops, { name: "", detail: "" }])}
        className="mt-2 h-8 px-3 text-[12px] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)]/40 rounded-[var(--radius-sm)]"
      >
        + Add stop
      </button>
    </div>
  );
}

/* ============================ Addons ============================ */

function AddonsSection({
  tourSlug,
  initialAddons,
  actions,
  pending,
  announce,
  startTransition,
}: {
  tourSlug: string;
  initialAddons: TourAddonRow[];
  actions: Actions;
  pending: boolean;
  announce: (ok: boolean, msg: string) => void;
  startTransition: React.TransitionStartFunction;
}) {
  const [addons, setAddons] = useState(initialAddons);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);

  function updateAddon(i: number, patch: Partial<TourAddonRow>) {
    setAddons((prev) => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  function saveAddon(a: TourAddonRow) {
    startTransition(async () => {
      const r = await actions.upsertTourAddon({
        id: a.id || undefined,
        tour_slug: tourSlug,
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
        const r = await actions.deleteTourAddon(a.id, tourSlug);
        if (r.ok) setAddons((prev) => prev.filter((_, idx) => idx !== i));
        announce(r.ok, r.ok ? "Addon deleted" : r.error ?? "Delete failed");
      });
    } else {
      setAddons((prev) => prev.filter((_, idx) => idx !== i));
    }
  }
  function addAddon() {
    const blank: TourAddonRow = {
      id: "",
      tour_slug: tourSlug,
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
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" checked={a.is_required} onChange={(e) => updateAddon(i, { is_required: e.target.checked })} />
                  <span className="text-[13px]">Required (auto-included, non-toggleable)</span>
                </label>
                {!a.is_required && (
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={a.default_selected} onChange={(e) => updateAddon(i, { default_selected: e.target.checked })} />
                    <span className="text-[13px]">Default checked in Extras</span>
                  </label>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Group key (radio)">
                  <input value={a.group_key ?? ""} onChange={(e) => updateAddon(i, { group_key: e.target.value || null })} placeholder="e.g. hotel-pre-tour" className={inputCls} />
                </Field>
                <Field label="Priority">
                  <input type="number" value={a.priority} onChange={(e) => updateAddon(i, { priority: Number(e.target.value) || 0 })} className={inputCls} />
                </Field>
                <Field label="Duration delta (days)">
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

/* ============================ Departures ============================ */

function addDaysISO(iso: string, days: number): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function DeparturesSection({
  tourSlug,
  duration,
  initialDepartures,
  actions,
  pending,
  announce,
  startTransition,
}: {
  tourSlug: string;
  duration: number;
  initialDepartures: DepartureRow[];
  actions: Actions;
  pending: boolean;
  announce: (ok: boolean, msg: string) => void;
  startTransition: React.TransitionStartFunction;
}) {
  const [rows, setRows] = useState(initialDepartures);
  const [editingId, setEditingId] = useState<string | null>(null);

  function update(i: number, patch: Partial<DepartureRow>) {
    setRows((prev) => {
      const next = prev.slice();
      next[i] = { ...next[i], ...patch };
      // Keep end_date pinned to departure_date + (duration - 1) unless the
      // admin explicitly overrides it (i.e. when duration or date changes).
      if ((patch.departure_date || patch.max_seats === undefined) && next[i].departure_date && !patch.end_date) {
        next[i] = { ...next[i], end_date: addDaysISO(next[i].departure_date, Math.max(0, duration - 1)) };
      }
      return next;
    });
  }

  function save(row: DepartureRow) {
    const twin = row.twin_price ?? 0;
    const single = row.single_price ?? 0;
    startTransition(async () => {
      const r = await actions.upsertDeparture({
        id: row.id || undefined,
        tour_slug: tourSlug,
        departure_date: row.departure_date,
        end_date: row.end_date,
        max_seats: row.max_seats,
        price: row.price,
        twin_price: twin,
        single_price: single,
        status: row.status,
      });
      if (r.ok && r.id && !row.id) {
        setRows((prev) => prev.map((x) => (x === row ? { ...x, id: r.id! } : x)));
      }
      announce(r.ok, r.ok ? "Departure saved" : r.error ?? "Save failed");
    });
  }

  function remove(i: number) {
    const row = rows[i];
    if (!confirm(`Delete departure on ${row.departure_date}?`)) return;
    if (row.id) {
      startTransition(async () => {
        const r = await actions.deleteDeparture(row.id, tourSlug);
        if (r.ok) setRows((prev) => prev.filter((_, idx) => idx !== i));
        announce(r.ok, r.ok ? "Departure deleted" : r.error ?? "Delete failed");
      });
    } else {
      setRows((prev) => prev.filter((_, idx) => idx !== i));
    }
  }

  function addRow() {
    const last = rows[rows.length - 1];
    const seed: DepartureRow = {
      id: "",
      tour_slug: tourSlug,
      departure_date: last?.departure_date ?? new Date().toISOString().slice(0, 10),
      end_date: last?.end_date ?? null,
      departure_city: null,
      max_seats: last?.max_seats ?? 12,
      seats_booked: 0,
      status: "open",
      price: last?.price ?? 0,
      twin_price: last?.twin_price ?? 0,
      single_price: last?.single_price ?? 0,
      created_at: "",
    };
    setRows((prev) => [...prev, seed]);
    setEditingId(seed.id || `new-${rows.length}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[var(--text-tertiary)]">
        Base ground price + seat inventory per date. Per-home-city variance is layered on via the Addons tab.
        End date defaults to departure + {duration - 1} day{duration - 1 === 1 ? "" : "s"}.
      </p>
      {rows.map((r, i) => {
        const seatsLeft = r.max_seats - r.seats_booked;
        const key = r.id || `new-${i}`;
        const editing = editingId === key;
        return (
          <div key={key} className="border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-semibold text-[var(--text-primary)]">
                  {r.departure_date || "(no date)"} → {r.end_date || "—"}
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)]">
                  Base {formatPrice(r.price)} · Twin +{formatPrice(r.twin_price ?? 0)} / person · Single +{formatPrice(r.single_price ?? 0)} / person
                  {" "}· {r.seats_booked}/{r.max_seats} seats ({seatsLeft} left) · {r.status}
                </div>
              </div>
              <button type="button" onClick={() => setEditingId(editing ? null : key)} className="text-[12px] font-semibold text-[var(--primary)] hover:underline">
                {editing ? "Close" : "Edit"}
              </button>
              <button type="button" onClick={() => remove(i)} className="text-[12px] font-semibold text-[var(--error)] hover:underline">Delete</button>
            </div>

            {editing && (
              <div className="mt-3 space-y-3 border-t border-[var(--border-default)] pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Departure date">
                    <input type="date" value={r.departure_date} onChange={(e) => update(i, { departure_date: e.target.value })} className={inputCls} />
                  </Field>
                  <Field label="End date">
                    <input type="date" value={r.end_date ?? ""} onChange={(e) => update(i, { end_date: e.target.value || null })} className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Base price / person (PKR) — group / triple / quad share">
                    <input type="number" value={r.price} onChange={(e) => update(i, { price: Number(e.target.value) || 0 })} className={inputCls} />
                  </Field>
                  <Field label="Max seats">
                    <input type="number" value={r.max_seats} onChange={(e) => update(i, { max_seats: Number(e.target.value) || 0 })} className={inputCls} />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Twin surcharge (PKR / person) — 2 friends alone in a room">
                    <input
                      type="number"
                      value={r.twin_price ?? 0}
                      onChange={(e) => update(i, { twin_price: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Single surcharge (PKR / person) — 1 alone in a room">
                    <input
                      type="number"
                      value={r.single_price ?? 0}
                      onChange={(e) => update(i, { single_price: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </Field>
                </div>
                <Field label="Status">
                  <div className="flex gap-1.5">
                    {(["open", "closed", "cancelled"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => update(i, { status: s })}
                        className={r.status === s ? chipActive : chip}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => save(r)}
                    className="h-9 px-4 text-[13px] font-semibold bg-[var(--primary)] text-[var(--text-inverse)] rounded-[var(--radius-sm)] disabled:opacity-60"
                  >
                    {pending ? "Saving…" : r.id ? "Save departure" : "Create departure"}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={addRow}
        className="h-9 px-3 text-[12px] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)]/40 rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)]"
      >
        + Add departure
      </button>
    </div>
  );
}

/* ============================ Preview ============================ */

// Renders the live tour page in an iframe, forcing the initial home city via
// ?preview=CITY. Lets admins verify inclusions/exclusions/itinerary filters
// without re-implementing anything editor-side.
function PreviewSection({ tourSlug, anchorCity }: { tourSlug: string; anchorCity: Home | null }) {
  const [city, setCity] = useState<Home>(anchorCity ?? "ISB");
  const src = `/grouptours/${tourSlug}?preview=${city}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[13px] text-[var(--text-secondary)]">Viewing as a traveler from:</div>
        <div className="flex gap-1.5">
          {(["ISB", "LHE", "KHI", "KDU"] as Home[]).map((c) => (
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
        <a href={src} target="_blank" rel="noreferrer" className="text-[12px] font-semibold text-[var(--primary)] hover:underline">
          Open in new tab ↗
        </a>
      </div>
      <div className="border border-[var(--border-default)] rounded-[var(--radius-sm)] overflow-hidden bg-[var(--bg-primary)]" style={{ height: "80vh" }}>
        {/* key forces reload on city change so the initial-departure prop takes effect */}
        <iframe key={city} src={src} title={`Preview ${tourSlug} as ${city}`} className="w-full h-full" />
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
    // Successful rename redirects — we may never get here. On failure, show
    // the error and stay open.
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
          Updates the URL for this tour and all references (itinerary days, addons, departures, reviews). Old URL will 404 — set up a redirect at your edge if the page had traffic.
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
          <span className="text-[11px] text-[var(--text-tertiary)] mt-1 block">Lowercase letters, digits, and single dashes only.</span>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">{label}</span>
      {children}
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
