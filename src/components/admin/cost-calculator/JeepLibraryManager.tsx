"use client";

import { useState } from "react";

export interface KnownJeepLeg {
  id?: string;
  name: string;
  costPerJeep: number;
  capacity: number;
}

interface Props {
  legs: KnownJeepLeg[];
  onLibraryChange: (legs: KnownJeepLeg[]) => void;
}

/**
 * Dedicated library-management UI for `known_jeep_legs`. Distinct from the
 * per-package jeep-leg editor — adding here does NOT attach the leg to the
 * picked package, only to the library. After save, the autocomplete dropdown
 * on the per-package editor picks it up immediately because the parent owns
 * the `knownJeepLegs` state.
 */
export function JeepLibraryManager({ legs, onLibraryChange }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [cost, setCost] = useState<number | "">("");
  const [capacity, setCapacity] = useState<number>(5);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const canSave = name.trim().length > 0 && typeof cost === "number" && cost > 0 && capacity > 0;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/admin/known-jeep-legs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), costPerJeep: cost, capacity }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { leg: KnownJeepLeg };
      const merged = [...legs.filter((p) => p.name !== body.leg.name), body.leg]
        .sort((a, b) => a.name.localeCompare(b.name));
      onLibraryChange(merged);
      setFeedback({ kind: "ok", msg: `Added "${body.leg.name}" to library. Now in autocomplete.` });
      setName("");
      setCost("");
      setCapacity(5);
    } catch (err) {
      setFeedback({ kind: "err", msg: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl p-4" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Jeep ride library
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            {legs.length} known route{legs.length === 1 ? "" : "s"} · adds appear in the per-package autocomplete on save.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setFeedback(null); }}
          className="text-xs rounded px-3 py-1.5 border"
          style={{ borderColor: "var(--border-default)", color: "var(--text-primary)", background: "var(--bg-primary)" }}
        >
          {open ? "Close" : "Add new ride to library"}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-12 gap-2">
            <label className="col-span-6 text-xs">
              <span style={{ color: "var(--text-tertiary)" }}>Route name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Astak Nala / Babusar Local"
                className="mt-1 w-full rounded px-2 py-2 text-sm"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              />
            </label>
            <label className="col-span-3 text-xs">
              <span style={{ color: "var(--text-tertiary)" }}>Cost / jeep</span>
              <input
                type="number"
                min={0}
                step={500}
                value={cost}
                onChange={(e) => setCost(e.target.value === "" ? "" : Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="mt-1 w-full rounded px-2 py-2 text-sm"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              />
            </label>
            <label className="col-span-2 text-xs">
              <span style={{ color: "var(--text-tertiary)" }}>Capacity</span>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || 1))}
                className="mt-1 w-full rounded px-2 py-2 text-sm"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              />
            </label>
            <div className="col-span-1 flex items-end">
              <button
                type="button"
                onClick={save}
                disabled={!canSave || saving}
                className="w-full text-xs rounded px-2 py-2 font-semibold disabled:opacity-40"
                style={{ background: "var(--primary)", color: "var(--on-primary, white)" }}
              >
                {saving ? "…" : "Save"}
              </button>
            </div>
          </div>
          {feedback && (
            <p
              className="text-xs"
              style={{ color: feedback.kind === "ok" ? "var(--primary)" : "var(--accent-danger)" }}
            >
              {feedback.msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
