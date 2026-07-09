"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { DateField } from "@/components/ui/DateField";
import { COUNTRIES } from "@/lib/invitation/countries";

type Props = {
  createAction: (formData: FormData) => Promise<void>;
};

export function NewInvitationRequestForm({ createAction }: Props) {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [embassyCountry, setEmbassyCountry] = useState("");
  const [embassyCity, setEmbassyCity] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [destinations, setDestinations] = useState("Islamabad, Skardu, Hunza");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const inputCls =
    "w-full h-10 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px]";
  const labelCls = "block text-[12px] font-semibold text-[var(--text-tertiary)] mb-1";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    if (arrivalDate && departureDate && departureDate < arrivalDate) {
      setError("Departure date must be on or after arrival date.");
      return;
    }
    const fd = new FormData();
    fd.set("contact_name", contactName.trim());
    fd.set("contact_email", contactEmail.trim());
    fd.set("contact_phone", contactPhone.trim());
    fd.set("embassy_country", embassyCountry);
    fd.set("embassy_city", embassyCity.trim());
    fd.set("arrival_date", arrivalDate);
    fd.set("departure_date", departureDate);
    fd.set("destinations", destinations);
    startTransition(async () => {
      try {
        await createAction(fd);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create request");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Contact</h2>
        <div>
          <label className={labelCls}>Contact name *</label>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} required minLength={2} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email letter will be sent to *</label>
          <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" required className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[13px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Embassy & trip</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Embassy country</label>
            <select value={embassyCountry} onChange={(e) => setEmbassyCountry(e.target.value)} className={inputCls}>
              <option value="">Select…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Embassy city</label>
            <input value={embassyCity} onChange={(e) => setEmbassyCity(e.target.value)} placeholder="Madrid" className={inputCls} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Arrival date</label>
            <DateField value={arrivalDate} onChange={setArrivalDate} mode="future" />
          </div>
          <div>
            <label className={labelCls}>Departure date</label>
            <DateField value={departureDate} onChange={setDepartureDate} mode="future" minDate={arrivalDate || undefined} />
          </div>
        </div>
        <div>
          <label className={labelCls}>Destinations (comma-separated)</label>
          <input value={destinations} onChange={(e) => setDestinations(e.target.value)} className={inputCls} />
        </div>
      </section>

      {error && <div className="text-[13px] text-[var(--error)]">{error}</div>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link href="/admin/invitation-letters" className="text-[13px] text-[var(--text-tertiary)]">Cancel</Link>
        <button
          type="submit"
          disabled={pending}
          className="h-10 px-5 rounded-[var(--radius-sm)] bg-[var(--primary)] text-white text-[13px] font-semibold disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create request"}
        </button>
      </div>
    </form>
  );
}
