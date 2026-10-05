"use client";

import { useState, useTransition } from "react";
import type { TourBookingDetailsPatch } from "@/app/admin/tourbookings/actions";

type DepartureOption = {
  id: string;
  label: string; // e.g. "Blossom Trip to Hunza — 2026-04-15 (ISB)"
};

type Initial = {
  departure_id: string;
  seats: number;
  single_rooms: number;
  home_city: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  total_amount: number;
  amount_paid: number;
  notes: string | null;
};

type Props = {
  id: string;
  initial: Initial;
  departures: DepartureOption[];
  saveAction: (
    id: string,
    patch: TourBookingDetailsPatch,
  ) => Promise<{ ok: boolean; error?: string }>;
};

const CITIES = [
  { value: "islamabad", label: "Islamabad (ISB)" },
  { value: "lahore", label: "Lahore (LHE)" },
  { value: "karachi", label: "Karachi (KHI)" },
  { value: "skardu", label: "Skardu (KDU)" },
];

const labelCls = "block text-[12px] font-medium text-[var(--text-tertiary)] mb-1";
const inputCls =
  "w-full h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]";

export function TourBookingEditor({ id, initial, departures, saveAction }: Props) {
  const [form, setForm] = useState<Initial>(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  function set<K extends keyof Initial>(k: K, v: Initial[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
    setMsg(null);
    setErr(null);
  }

  function onSave() {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const patch: TourBookingDetailsPatch = { ...form };
      const res = await saveAction(id, patch);
      if (res.ok) setMsg("Saved");
      else setErr(res.error ?? "Save failed");
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Departure
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Departure</label>
            <select
              value={form.departure_id}
              onChange={(e) => set("departure_id", e.target.value)}
              className={inputCls}
            >
              {departures.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
              {!departures.some((d) => d.id === form.departure_id) && (
                <option value={form.departure_id}>
                  {form.departure_id} (archived — not shown above)
                </option>
              )}
            </select>
          </div>
          <div>
            <label className={labelCls}>Seats</label>
            <input
              type="number"
              min={1}
              value={form.seats}
              onChange={(e) => set("seats", Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Single rooms</label>
            <input
              type="number"
              min={0}
              value={form.single_rooms}
              onChange={(e) => set("single_rooms", Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Home city</label>
            <select
              value={form.home_city ?? ""}
              onChange={(e) => set("home_city", e.target.value || null)}
              className={inputCls}
            >
              <option value="">—</option>
              {CITIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Guest
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Name</label>
            <input
              type="text"
              value={form.contact_name}
              onChange={(e) => set("contact_name", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input
              type="email"
              value={form.contact_email}
              onChange={(e) => set("contact_email", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Phone</label>
            <input
              type="tel"
              value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Payment
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Total amount (PKR)</label>
            <input
              type="number"
              min={0}
              step={100}
              value={form.total_amount}
              onChange={(e) => set("total_amount", Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Amount paid (PKR) — split-pay running total</label>
            <input
              type="number"
              min={0}
              step={100}
              value={form.amount_paid}
              onChange={(e) => set("amount_paid", Number(e.target.value))}
              className={inputCls}
            />
          </div>
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes (internal)</label>
        <textarea
          rows={3}
          value={form.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          className={inputCls + " h-auto py-2"}
        />
      </div>

      <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-default)]">
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !dirty}
          className="h-10 px-4 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--on-primary,white)] text-[13px] font-semibold disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        {dirty && !pending && (
          <span className="text-[12px] text-[var(--text-tertiary)]">Unsaved changes</span>
        )}
        {msg && <span className="text-[12px] text-[var(--success)]">{msg}</span>}
        {err && <span className="text-[12px] text-[var(--error)]">{err}</span>}
      </div>
    </div>
  );
}
