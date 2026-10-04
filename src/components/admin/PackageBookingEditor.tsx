"use client";

import { useState, useTransition } from "react";
import type { PackageBookingDetailsPatch } from "@/app/admin/package-bookings/actions";

type PackageOption = { slug: string; name: string };

type Initial = {
  package_slug: string;
  tier: string;
  departure_city: string | null;
  start_date: string | null;
  adults: number;
  rooms: number;
  children_5_12: number;
  children_2_5: number;
  infants: number;
  notes: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  total_amount: number;
  amount_paid: number;
};

type Props = {
  id: string;
  initial: Initial;
  packages: PackageOption[];
  saveAction: (
    id: string,
    patch: PackageBookingDetailsPatch,
  ) => Promise<{ ok: boolean; error?: string }>;
};

const TIERS = [
  { value: "deluxe", label: "Deluxe" },
  { value: "luxury", label: "Luxury" },
];

const CITIES = [
  { value: "islamabad", label: "Islamabad (ISB)" },
  { value: "lahore", label: "Lahore (LHE)" },
  { value: "karachi", label: "Karachi (KHI)" },
  { value: "skardu", label: "Skardu (KDU)" },
];

const labelCls = "block text-[12px] font-medium text-[var(--text-tertiary)] mb-1";
const inputCls =
  "w-full h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]";

export function PackageBookingEditor({ id, initial, packages, saveAction }: Props) {
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
      const patch: PackageBookingDetailsPatch = { ...form };
      const res = await saveAction(id, patch);
      if (res.ok) setMsg("Saved");
      else setErr(res.error ?? "Save failed");
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Trip
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Package</label>
            <select
              value={form.package_slug}
              onChange={(e) => set("package_slug", e.target.value)}
              className={inputCls}
            >
              {packages.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
              {!packages.some((p) => p.slug === form.package_slug) && (
                <option value={form.package_slug}>
                  {form.package_slug} (not in current list)
                </option>
              )}
            </select>
          </div>
          <div>
            <label className={labelCls}>Tier</label>
            <select
              value={form.tier}
              onChange={(e) => set("tier", e.target.value)}
              className={inputCls}
            >
              {TIERS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Departure city</label>
            <select
              value={form.departure_city ?? ""}
              onChange={(e) => set("departure_city", e.target.value || null)}
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
          <div>
            <label className={labelCls}>Start date</label>
            <input
              type="date"
              value={form.start_date ?? ""}
              onChange={(e) => set("start_date", e.target.value || null)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Rooms</label>
            <input
              type="number"
              min={1}
              value={form.rooms}
              onChange={(e) => set("rooms", Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Adults</label>
            <input
              type="number"
              min={1}
              value={form.adults}
              onChange={(e) => set("adults", Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Children (5–12)</label>
            <input
              type="number"
              min={0}
              value={form.children_5_12}
              onChange={(e) => set("children_5_12", Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Children (2–5)</label>
            <input
              type="number"
              min={0}
              value={form.children_2_5}
              onChange={(e) => set("children_2_5", Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Infants</label>
            <input
              type="number"
              min={0}
              value={form.infants}
              onChange={(e) => set("infants", Number(e.target.value))}
              className={inputCls}
            />
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
