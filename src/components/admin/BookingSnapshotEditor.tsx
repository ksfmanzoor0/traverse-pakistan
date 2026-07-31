"use client";

import { useMemo, useState, useTransition } from "react";
import { saveBookingItinerarySnapshot } from "@/app/admin/package-bookings/[ref]/actions";
import type { PackageBookingSnapshot, BookingSnapshotDay } from "@/types/packageBookingSnapshot";

interface HotelOption {
  slug: string;
  name: string;
  location: string;
  tier: string;
}

interface Props {
  bookingRef: string;
  initialSnapshot: PackageBookingSnapshot;
  hotels: HotelOption[];
}

function copyDay(d: BookingSnapshotDay): BookingSnapshotDay {
  return { ...d, stops: d.stops.map((s) => ({ ...s })) };
}

function copySnapshot(s: PackageBookingSnapshot): PackageBookingSnapshot {
  return {
    days: s.days.map(copyDay),
    inclusions: [...s.inclusions],
    exclusions: [...s.exclusions],
    updatedAt: s.updatedAt,
  };
}

export function BookingSnapshotEditor({ bookingRef, initialSnapshot, hotels }: Props) {
  const [snapshot, setSnapshot] = useState<PackageBookingSnapshot>(() => copySnapshot(initialSnapshot));
  const [isSaving, startSaving] = useTransition();
  const [flash, setFlash] = useState<{ kind: "success" | "error"; msg: string } | null>(null);

  const hotelsSorted = useMemo(
    () => [...hotels].sort((a, b) => a.name.localeCompare(b.name)),
    [hotels],
  );

  const updateDay = (idx: number, patch: Partial<BookingSnapshotDay>) => {
    setSnapshot((prev) => {
      const days = prev.days.map((d, i) => (i === idx ? { ...d, ...patch } : d));
      return { ...prev, days };
    });
  };

  const addStop = (dayIdx: number) => {
    setSnapshot((prev) => {
      const days = prev.days.map((d, i) =>
        i === dayIdx ? { ...d, stops: [...d.stops, { name: "", detail: "" }] } : d,
      );
      return { ...prev, days };
    });
  };

  const updateStop = (dayIdx: number, stopIdx: number, patch: Partial<{ name: string; detail: string }>) => {
    setSnapshot((prev) => {
      const days = prev.days.map((d, i) => {
        if (i !== dayIdx) return d;
        const stops = d.stops.map((s, j) => (j === stopIdx ? { ...s, ...patch } : s));
        return { ...d, stops };
      });
      return { ...prev, days };
    });
  };

  const removeStop = (dayIdx: number, stopIdx: number) => {
    setSnapshot((prev) => {
      const days = prev.days.map((d, i) => {
        if (i !== dayIdx) return d;
        return { ...d, stops: d.stops.filter((_, j) => j !== stopIdx) };
      });
      return { ...prev, days };
    });
  };

  const updateInclusion = (idx: number, val: string) =>
    setSnapshot((prev) => ({ ...prev, inclusions: prev.inclusions.map((s, i) => (i === idx ? val : s)) }));

  const removeInclusion = (idx: number) =>
    setSnapshot((prev) => ({ ...prev, inclusions: prev.inclusions.filter((_, i) => i !== idx) }));

  const addInclusion = () =>
    setSnapshot((prev) => ({ ...prev, inclusions: [...prev.inclusions, ""] }));

  const updateExclusion = (idx: number, val: string) =>
    setSnapshot((prev) => ({ ...prev, exclusions: prev.exclusions.map((s, i) => (i === idx ? val : s)) }));

  const removeExclusion = (idx: number) =>
    setSnapshot((prev) => ({ ...prev, exclusions: prev.exclusions.filter((_, i) => i !== idx) }));

  const addExclusion = () =>
    setSnapshot((prev) => ({ ...prev, exclusions: [...prev.exclusions, ""] }));

  const onSave = () => {
    setFlash(null);
    // Trim empties so the DB stays clean.
    const cleaned: PackageBookingSnapshot = {
      ...snapshot,
      inclusions: snapshot.inclusions.map((s) => s.trim()).filter(Boolean),
      exclusions: snapshot.exclusions.map((s) => s.trim()).filter(Boolean),
      days: snapshot.days.map((d) => ({
        ...d,
        stops: d.stops.filter((s) => s.name.trim() || s.detail.trim()),
      })),
    };
    startSaving(async () => {
      const res = await saveBookingItinerarySnapshot(bookingRef, cleaned);
      if (res.ok) {
        setFlash({ kind: "success", msg: "Saved — PDF will use these edits." });
        setSnapshot(cleaned);
      } else {
        setFlash({ kind: "error", msg: res.error });
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* Days */}
      <section>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Day-by-day itinerary</h2>
        <div className="space-y-4">
          {snapshot.days.map((day, idx) => (
            <div key={day.dayNumber} className="rounded-[var(--radius-md)] border border-[var(--border-default)] p-4 bg-[var(--bg-primary)]">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-full bg-[var(--primary)] text-white flex flex-col items-center justify-center shrink-0 leading-none">
                  <span className="text-[9px] tracking-widest">DAY</span>
                  <span className="text-sm font-bold">{day.dayNumber}</span>
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <input
                    type="text"
                    value={day.title}
                    onChange={(e) => updateDay(idx, { title: e.target.value })}
                    placeholder="Day title"
                    className="w-full text-[15px] font-bold px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)]"
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="text"
                      value={day.overnight}
                      onChange={(e) => updateDay(idx, { overnight: e.target.value })}
                      placeholder="Overnight location"
                      className="px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px]"
                    />
                    <input
                      type="text"
                      value={day.drivingTime}
                      onChange={(e) => updateDay(idx, { drivingTime: e.target.value })}
                      placeholder="Driving time (e.g. 3h)"
                      className="px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px]"
                    />
                    <select
                      value={day.hotelSlug}
                      onChange={(e) => updateDay(idx, { hotelSlug: e.target.value })}
                      className="px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px]"
                    >
                      <option value="">— No hotel (transit) —</option>
                      {hotelsSorted.map((h) => (
                        <option key={h.slug} value={h.slug}>
                          {h.name} · {h.location} · {h.tier}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={day.description}
                    onChange={(e) => updateDay(idx, { description: e.target.value })}
                    placeholder="Day description"
                    rows={3}
                    className="w-full px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] resize-y"
                  />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Stops</p>
                    <div className="space-y-2">
                      {day.stops.map((stop, sidx) => (
                        <div key={sidx} className="flex gap-2">
                          <input
                            type="text"
                            value={stop.name}
                            onChange={(e) => updateStop(idx, sidx, { name: e.target.value })}
                            placeholder="Stop name"
                            className="w-52 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px]"
                          />
                          <input
                            type="text"
                            value={stop.detail}
                            onChange={(e) => updateStop(idx, sidx, { detail: e.target.value })}
                            placeholder="Detail"
                            className="flex-1 px-3 py-1.5 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px]"
                          />
                          <button
                            type="button"
                            onClick={() => removeStop(idx, sidx)}
                            className="text-[12px] text-[var(--text-tertiary)] hover:text-red-600 px-2"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addStop(idx)}
                        className="text-[12px] font-semibold text-[var(--primary)] hover:underline"
                      >
                        + Add stop
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Inclusions */}
      <section>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">What&apos;s included</h2>
        <div className="space-y-2">
          {snapshot.inclusions.map((line, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={line}
                onChange={(e) => updateInclusion(idx, e.target.value)}
                className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px]"
              />
              <button
                type="button"
                onClick={() => removeInclusion(idx)}
                className="text-[12px] text-[var(--text-tertiary)] hover:text-red-600 px-3"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addInclusion}
            className="text-[12px] font-semibold text-[var(--primary)] hover:underline"
          >
            + Add inclusion
          </button>
        </div>
      </section>

      {/* Exclusions */}
      <section>
        <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">What&apos;s not included</h2>
        <div className="space-y-2">
          {snapshot.exclusions.map((line, idx) => (
            <div key={idx} className="flex gap-2">
              <input
                type="text"
                value={line}
                onChange={(e) => updateExclusion(idx, e.target.value)}
                className="flex-1 px-3 py-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px]"
              />
              <button
                type="button"
                onClick={() => removeExclusion(idx)}
                className="text-[12px] text-[var(--text-tertiary)] hover:text-red-600 px-3"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addExclusion}
            className="text-[12px] font-semibold text-[var(--primary)] hover:underline"
          >
            + Add exclusion
          </button>
        </div>
      </section>

      {/* Save */}
      <div className="sticky bottom-4 z-10 flex items-center gap-3 justify-end pt-4 border-t border-[var(--border-default)] bg-[var(--bg-primary)]/95 backdrop-blur pb-2">
        {flash && (
          <span className={flash.kind === "success" ? "text-[13px] text-[var(--primary)]" : "text-[13px] text-red-600"}>
            {flash.msg}
          </span>
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="h-11 px-6 rounded-[var(--radius-sm)] bg-[var(--primary)] text-white text-[14px] font-bold hover:bg-[var(--primary-hover)] disabled:opacity-50"
        >
          {isSaving ? "Saving…" : "Save itinerary"}
        </button>
      </div>
    </div>
  );
}
