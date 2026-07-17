"use client";

import { useMemo, useState, useTransition } from "react";
import type { ItineraryDayInput, ItineraryStop } from "@/app/admin/packages/actions";

type Day = {
  day_number: number;
  title: string | null;
  description: string | null;
  hotel_deluxe: string | null;
  hotel_luxury: string | null;
  stops: ItineraryStop[] | null;
  driving_time: string | null;
  overnight: string | null;
  city_only: string[] | null;
};

type HotelOption = { slug: string; name: string; tier: string | null };

type Props = {
  packageSlug: string;
  expectedDays: number;
  initialDays: Day[];
  hotels: HotelOption[];
  saveAction: (packageSlug: string, days: ItineraryDayInput[]) => Promise<{ ok: boolean; error?: string }>;
};

const inputCls = "w-full h-10 px-3 rounded-[var(--radius-sm)] border text-[14px]";
const inputStyle: React.CSSProperties = { borderColor: "var(--border-default)", background: "var(--bg-primary)" };
const areaCls = "w-full px-3 py-2 rounded-[var(--radius-sm)] border text-[14px] leading-[1.5]";
const labelCls = "block text-[12px] font-semibold uppercase tracking-wider mb-1";
const labelStyle: React.CSSProperties = { color: "var(--text-tertiary)" };

function emptyDay(dayNumber: number): Day {
  return {
    day_number: dayNumber,
    title: "",
    description: "",
    hotel_deluxe: null,
    hotel_luxury: null,
    stops: [],
    driving_time: "",
    overnight: "",
    city_only: null,
  };
}

function StopsEditor({
  stops,
  onChange,
}: {
  stops: ItineraryStop[];
  onChange: (next: ItineraryStop[]) => void;
}) {
  function update(i: number, patch: Partial<ItineraryStop>) {
    onChange(stops.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function add() {
    onChange([...stops, { name: "", detail: "" }]);
  }
  function remove(i: number) {
    onChange(stops.filter((_, idx) => idx !== i));
  }
  function move(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= stops.length) return;
    const next = [...stops];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  return (
    <div>
      <label className={labelCls} style={labelStyle}>Stops</label>
      <div className="space-y-2">
        {stops.length === 0 && (
          <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
            None yet — click Add.
          </p>
        )}
        {stops.map((s, i) => (
          <div key={i} className="flex items-start gap-2">
            <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2 flex-1">
              <input
                value={s.name}
                onChange={(e) => update(i, { name: e.target.value })}
                placeholder="e.g. Attabad Lake"
                className={inputCls}
                style={inputStyle}
              />
              <input
                value={s.detail}
                onChange={(e) => update(i, { detail: e.target.value })}
                placeholder="e.g. Boating 11:30 am"
                className={inputCls}
                style={inputStyle}
              />
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="h-8 w-8 text-[13px] rounded-[var(--radius-sm)] border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--border-default)" }}
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(i, 1)}
                disabled={i === stops.length - 1}
                className="h-8 w-8 text-[13px] rounded-[var(--radius-sm)] border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: "var(--border-default)" }}
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => remove(i)}
                className="h-8 px-2 text-[12px] rounded-[var(--radius-sm)] border cursor-pointer"
                style={{ borderColor: "var(--border-default)", color: "var(--error)" }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-2 h-8 px-3 text-[12px] rounded-[var(--radius-sm)] border cursor-pointer"
        style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
      >
        + Add stop
      </button>
    </div>
  );
}

export function ItineraryEditor({ packageSlug, expectedDays, initialDays, hotels, saveAction }: Props) {
  const [days, setDays] = useState<Day[]>(() => {
    if (initialDays.length > 0) return initialDays.map((d) => ({ ...d, stops: d.stops ?? [] }));
    return Array.from({ length: expectedDays }, (_, i) => emptyDay(i + 1));
  });
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hotelsByTier = useMemo(() => {
    const deluxe = hotels.filter((h) => (h.tier ?? "").toLowerCase().includes("deluxe"));
    const luxury = hotels.filter((h) => (h.tier ?? "").toLowerCase().includes("luxury"));
    return { deluxe, luxury };
  }, [hotels]);

  function updateDay(i: number, patch: Partial<Day>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }
  function addDay() {
    setDays((prev) => [...prev, emptyDay(prev.length + 1)]);
    setOpenIdx(days.length);
  }
  function removeDay(i: number) {
    if (!confirm(`Delete Day ${i + 1}? This will renumber later days.`)) return;
    setDays((prev) => prev.filter((_, idx) => idx !== i).map((d, idx) => ({ ...d, day_number: idx + 1 })));
    if (openIdx !== null && openIdx >= i) setOpenIdx(Math.max(0, openIdx - 1));
  }
  function moveDay(i: number, delta: -1 | 1) {
    const j = i + delta;
    if (j < 0 || j >= days.length) return;
    setDays((prev) => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((d, idx) => ({ ...d, day_number: idx + 1 }));
    });
    if (openIdx === i) setOpenIdx(j);
    else if (openIdx === j) setOpenIdx(i);
  }

  function onSave() {
    if (pending) return;
    setError(null);
    setOk(null);
    startTransition(async () => {
      const payload: ItineraryDayInput[] = days.map((d, idx) => ({
        day_number: idx + 1,
        title: d.title ?? "",
        description: d.description ?? "",
        hotel_deluxe: d.hotel_deluxe,
        hotel_luxury: d.hotel_luxury,
        stops: d.stops ?? [],
        driving_time: d.driving_time,
        overnight: d.overnight,
        city_only: d.city_only,
      }));
      const res = await saveAction(packageSlug, payload);
      if (!res.ok) {
        setError(res.error ?? "Save failed");
        return;
      }
      setOk("Saved.");
    });
  }

  const mismatch = days.length !== expectedDays;

  return (
    <div className="space-y-4">
      {mismatch && (
        <div
          className="p-3 rounded-[var(--radius-sm)] text-[12px]"
          style={{ background: "color-mix(in srgb, var(--warning) 12%, transparent)", color: "var(--warning)" }}
        >
          Itinerary has {days.length} days but the package is set to {expectedDays}. Update package duration to match, or add/remove days here.
        </div>
      )}

      <div className="space-y-3">
        {days.map((d, i) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={i}
              className="rounded-2xl overflow-hidden"
              style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="flex-1 text-left cursor-pointer"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                    Day {i + 1}
                  </div>
                  <div className="text-[14px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                    {d.title || <span style={{ color: "var(--text-tertiary)" }}>Untitled day</span>}
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => moveDay(i, -1)}
                    disabled={i === 0}
                    className="h-8 w-8 text-[13px] rounded-[var(--radius-sm)] border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--border-default)" }}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveDay(i, 1)}
                    disabled={i === days.length - 1}
                    className="h-8 w-8 text-[13px] rounded-[var(--radius-sm)] border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: "var(--border-default)" }}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeDay(i)}
                    className="h-8 px-2 text-[12px] rounded-[var(--radius-sm)] border cursor-pointer"
                    style={{ borderColor: "var(--border-default)", color: "var(--error)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="p-4 border-t space-y-4" style={{ borderColor: "var(--border-default)" }}>
                  <div>
                    <label className={labelCls} style={labelStyle}>Title</label>
                    <input
                      value={d.title ?? ""}
                      onChange={(e) => updateDay(i, { title: e.target.value })}
                      placeholder="e.g. Fly to Skardu → Upper Kachura Lake → Hunza"
                      className={inputCls}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label className={labelCls} style={labelStyle}>Description</label>
                    <textarea
                      value={d.description ?? ""}
                      onChange={(e) => updateDay(i, { description: e.target.value })}
                      rows={3}
                      className={areaCls}
                      style={inputStyle}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={labelStyle}>Deluxe hotel</label>
                      <select
                        value={d.hotel_deluxe ?? ""}
                        onChange={(e) => updateDay(i, { hotel_deluxe: e.target.value || null })}
                        className={inputCls}
                        style={inputStyle}
                      >
                        <option value="">— None —</option>
                        {hotelsByTier.deluxe.length > 0 && (
                          <optgroup label="Deluxe tier">
                            {hotelsByTier.deluxe.map((h) => (
                              <option key={h.slug} value={h.slug}>{h.name}</option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="All hotels">
                          {hotels.map((h) => (
                            <option key={`all-d-${h.slug}`} value={h.slug}>{h.name} ({h.tier ?? "—"})</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className={labelCls} style={labelStyle}>Luxury hotel</label>
                      <select
                        value={d.hotel_luxury ?? ""}
                        onChange={(e) => updateDay(i, { hotel_luxury: e.target.value || null })}
                        className={inputCls}
                        style={inputStyle}
                      >
                        <option value="">— None —</option>
                        {hotelsByTier.luxury.length > 0 && (
                          <optgroup label="Luxury tier">
                            {hotelsByTier.luxury.map((h) => (
                              <option key={h.slug} value={h.slug}>{h.name}</option>
                            ))}
                          </optgroup>
                        )}
                        <optgroup label="All hotels">
                          {hotels.map((h) => (
                            <option key={`all-l-${h.slug}`} value={h.slug}>{h.name} ({h.tier ?? "—"})</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls} style={labelStyle}>Driving time</label>
                      <input
                        value={d.driving_time ?? ""}
                        onChange={(e) => updateDay(i, { driving_time: e.target.value })}
                        placeholder="e.g. ~5 hrs (Skardu to Hunza)"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label className={labelCls} style={labelStyle}>Overnight</label>
                      <input
                        value={d.overnight ?? ""}
                        onChange={(e) => updateDay(i, { overnight: e.target.value })}
                        placeholder="e.g. Hunza"
                        className={inputCls}
                        style={inputStyle}
                      />
                    </div>
                  </div>

                  <StopsEditor
                    stops={d.stops ?? []}
                    onChange={(next) => updateDay(i, { stops: next })}
                  />

                  <div>
                    <label className={labelCls} style={labelStyle}>City-only (advanced)</label>
                    <input
                      value={(d.city_only ?? []).join(", ")}
                      onChange={(e) => {
                        const arr = e.target.value
                          .split(",")
                          .map((s) => s.trim().toLowerCase())
                          .filter(Boolean);
                        updateDay(i, { city_only: arr.length > 0 ? arr : null });
                      }}
                      placeholder="e.g. lahore, karachi"
                      className={inputCls}
                      style={inputStyle}
                    />
                    <p className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                      Engine hint — comma-separated city keys where hotels don&apos;t apply this day (e.g. transit night). Leave blank otherwise.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addDay}
        className="h-9 px-4 text-[13px] rounded-[var(--radius-sm)] border cursor-pointer"
        style={{ borderColor: "var(--border-default)", color: "var(--text-secondary)" }}
      >
        + Add day
      </button>

      <div
        className="sticky bottom-4 flex items-center justify-between gap-4 p-3 rounded-2xl"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", boxShadow: "0 8px 24px rgb(0 0 0 / 0.08)" }}
      >
        <div className="text-[12px]" style={{ color: ok ? "var(--success)" : error ? "var(--error)" : "var(--text-tertiary)" }}>
          {ok ?? error ?? `${days.length} day${days.length === 1 ? "" : "s"} · saves in one write`}
        </div>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          className="h-10 px-5 rounded-[var(--radius-sm)] text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
        >
          {pending ? "Saving…" : "Save itinerary"}
        </button>
      </div>
    </div>
  );
}
