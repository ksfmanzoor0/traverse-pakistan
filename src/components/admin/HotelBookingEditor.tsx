"use client";

import { useState, useTransition } from "react";
import type { HotelBookingDetailsPatch } from "@/app/admin/hotel-bookings/actions";

type HotelOption = { slug: string; name: string };

type Initial = {
  hotel_slug: string;
  checkin_date: string;
  checkout_date: string;
  adults: number;
  children: number;
  arrival_time: string | null;
  notes: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  total_amount: number;
};

type Props = {
  id: string;
  initial: Initial;
  hotels: HotelOption[];
  saveAction: (
    id: string,
    patch: HotelBookingDetailsPatch,
  ) => Promise<{ ok: boolean; error?: string }>;
};

const labelCls = "block text-[12px] font-medium text-[var(--text-tertiary)] mb-1";
const inputCls =
  "w-full h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]";

export function HotelBookingEditor({ id, initial, hotels, saveAction }: Props) {
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
      const patch: HotelBookingDetailsPatch = {
        hotel_slug: form.hotel_slug,
        checkin_date: form.checkin_date,
        checkout_date: form.checkout_date,
        adults: form.adults,
        children: form.children,
        arrival_time: form.arrival_time,
        notes: form.notes,
        contact_name: form.contact_name,
        contact_email: form.contact_email,
        contact_phone: form.contact_phone,
        total_amount: form.total_amount,
      };
      const res = await saveAction(id, patch);
      if (res.ok) setMsg("Saved");
      else setErr(res.error ?? "Save failed");
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-[13px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          Stay
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelCls}>Hotel</label>
            <select
              value={form.hotel_slug}
              onChange={(e) => set("hotel_slug", e.target.value)}
              className={inputCls}
            >
              {hotels.map((h) => (
                <option key={h.slug} value={h.slug}>
                  {h.name}
                </option>
              ))}
              {!hotels.some((h) => h.slug === form.hotel_slug) && (
                <option value={form.hotel_slug}>
                  {form.hotel_slug} (not in current list)
                </option>
              )}
            </select>
          </div>
          <div>
            <label className={labelCls}>Check-in</label>
            <input
              type="date"
              value={form.checkin_date}
              onChange={(e) => set("checkin_date", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Check-out</label>
            <input
              type="date"
              value={form.checkout_date}
              onChange={(e) => set("checkout_date", e.target.value)}
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
            <label className={labelCls}>Children</label>
            <input
              type="number"
              min={0}
              value={form.children}
              onChange={(e) => set("children", Number(e.target.value))}
              className={inputCls}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Arrival window (free text — e.g. &quot;12:00 PM – 2:00 PM&quot;)</label>
            <input
              type="text"
              value={form.arrival_time ?? ""}
              onChange={(e) => set("arrival_time", e.target.value)}
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
        </div>
      </div>

      <div>
        <label className={labelCls}>Notes (visible on the guest PDF)</label>
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
