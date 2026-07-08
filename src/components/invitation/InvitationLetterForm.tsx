"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { DateField } from "@/components/ui/DateField";
import { COUNTRIES, NATIONALITIES } from "@/lib/invitation/countries";
import type { Traveler } from "@/lib/invitation/types";

type TravelerDraft = {
  first_name: string;
  surname: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  passport_expiry: string;
};

const emptyTraveler: TravelerDraft = {
  first_name: "",
  surname: "",
  date_of_birth: "",
  nationality: "",
  passport_number: "",
  passport_expiry: "",
};

type Props = { priceUsd: number; pricePkr: number };

export function InvitationLetterForm({ priceUsd, pricePkr }: Props) {
  const [firstName, setFirstName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [embassyCountry, setEmbassyCountry] = useState("");
  const [embassyCity, setEmbassyCity] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [destinations, setDestinations] = useState("Islamabad, Skardu, Hunza");
  const [travelers, setTravelers] = useState<TravelerDraft[]>([{ ...emptyTraveler }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTraveler(i: number, patch: Partial<TravelerDraft>) {
    setTravelers((prev) => prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t)));
  }
  function addTraveler() {
    setTravelers((prev) => [...prev, { ...emptyTraveler }]);
  }
  function removeTraveler(i: number) {
    setTravelers((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (arrivalDate && departureDate && departureDate < arrivalDate) {
      setError("Departure date must be on or after arrival date.");
      return;
    }
    setSubmitting(true);
    try {
      const contactName = firstName.trim();
      const mappedTravelers: Traveler[] = travelers.map((t) => ({
        full_name: `${t.first_name.trim()} ${t.surname.trim()}`.trim(),
        date_of_birth: t.date_of_birth,
        nationality: t.nationality,
        passport_number: t.passport_number,
        passport_expiry: t.passport_expiry,
      }));
      const payload = {
        contact_name: contactName,
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        embassy_country: embassyCountry,
        embassy_city: embassyCity.trim(),
        arrival_date: arrivalDate,
        departure_date: departureDate,
        destinations: destinations.split(",").map((s) => s.trim()).filter(Boolean),
        travelers: mappedTravelers,
      };
      const res = await fetch("/api/invitation-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create request");

      const initRes = await fetch("/api/payments/alfa/initiate-invitation-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref: data.ref }),
      });
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error ?? "Could not start payment");

      const form = document.createElement("form");
      form.method = "POST";
      form.action = initData.ssoUrl;
      Object.entries(initData.ssoParams as Record<string, string>).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const labelCls = "block text-[13px] font-medium text-[var(--text-secondary)] mb-1";
  const req = <span className="text-[var(--error)] ml-0.5">*</span>;
  const inputCls =
    "w-full h-11 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[15px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]";
  const selectCls = inputCls + " appearance-none pr-9 bg-no-repeat bg-[right_0.75rem_center] bg-[length:1rem] cursor-pointer";
  const chevronBg = { backgroundImage: 'url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 20 20%27 fill=%27none%27 stroke=%27%23888%27 stroke-width=%272%27><polyline points=%275 8 10 13 15 8%27/></svg>")' };

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-3xl">
      <section>
        <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Your contact details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelCls}>Name{req}</label>
            <input required value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email{req}</label>
            <input required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone (with country code){req}</label>
            <input required type="tel" placeholder="+34 6XX XXX XXX" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-1">Where should we address the letter?</h2>
        <p className="text-[13px] text-[var(--text-tertiary)] mb-4">Optional — you can add these after payment or we&apos;ll follow up by email.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Country of embassy</label>
            <select value={embassyCountry} onChange={(e) => setEmbassyCountry(e.target.value)} className={selectCls} style={chevronBg}>
              <option value="">Select country</option>
              {COUNTRIES.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input placeholder="Madrid" value={embassyCity} onChange={(e) => setEmbassyCity(e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-1">Trip details</h2>
        <p className="text-[13px] text-[var(--text-tertiary)] mb-4">Optional — helpful to include if you already have plans.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Arrival date</label>
            <DateField value={arrivalDate} onChange={(v) => {
              setArrivalDate(v);
              if (departureDate && v && departureDate < v) setDepartureDate("");
            }} mode="future" />
          </div>
          <div>
            <label className={labelCls}>Departure date</label>
            <DateField value={departureDate} onChange={setDepartureDate} mode="future" minDate={arrivalDate} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Destinations to visit (comma-separated)</label>
            <input placeholder="Islamabad, Skardu, Hunza" value={destinations} onChange={(e) => setDestinations(e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-[18px] font-bold text-[var(--text-primary)]">Travelers</h2>
          <button type="button" onClick={addTraveler} className="text-[13px] font-semibold text-[var(--primary)]">
            + Add traveler
          </button>
        </div>
        <p className="text-[13px] text-[var(--text-tertiary)] mb-4">Optional — we&apos;ll ask for these details after payment if not provided.</p>
        <div className="space-y-6">
          {travelers.map((t, i) => (
            <div key={i} className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-semibold text-[var(--text-tertiary)]">Traveler {i + 1}</span>
                {travelers.length > 1 && (
                  <button type="button" onClick={() => removeTraveler(i)} className="text-[13px] text-[var(--error)]">Remove</button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>First name (as on passport)</label>
                  <input value={t.first_name} onChange={(e) => updateTraveler(i, { first_name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Surname</label>
                  <input value={t.surname} onChange={(e) => updateTraveler(i, { surname: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Date of birth</label>
                  <DateField value={t.date_of_birth} onChange={(v) => updateTraveler(i, { date_of_birth: v })} mode="past" />
                </div>
                <div>
                  <label className={labelCls}>Nationality</label>
                  <select value={t.nationality} onChange={(e) => updateTraveler(i, { nationality: e.target.value })} className={selectCls} style={chevronBg}>
                    <option value="">Select nationality</option>
                    {NATIONALITIES.map((n) => (<option key={n} value={n}>{n}</option>))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Passport number</label>
                  <input value={t.passport_number} onChange={(e) => updateTraveler(i, { passport_number: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Passport expiry</label>
                  <DateField value={t.passport_expiry} onChange={(v) => updateTraveler(i, { passport_expiry: v })} mode="future" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[15px] text-[var(--text-secondary)]">Service fee</span>
          <span className="text-[18px] font-bold text-[var(--text-primary)]">
            PKR {pricePkr.toLocaleString()} <span className="text-[13px] font-medium text-[var(--text-tertiary)]">(≈ USD {priceUsd})</span>
          </span>
        </div>
        <p className="text-[13px] text-[var(--text-tertiary)]">Non-refundable. Letter delivered to your email within 1 business day of payment.</p>
      </div>

      {error && (
        <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--error)]/10 text-[var(--error)] text-[14px]">{error}</div>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? "Redirecting to payment…" : `Pay PKR ${pricePkr.toLocaleString()} & submit`}
      </Button>
    </form>
  );
}
