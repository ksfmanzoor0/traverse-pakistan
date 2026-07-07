"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { Traveler } from "@/lib/invitation/types";

const emptyTraveler: Traveler = {
  full_name: "",
  date_of_birth: "",
  nationality: "",
  passport_number: "",
  passport_expiry: "",
};

type Props = { priceUsd: number; pricePkr: number };

export function InvitationLetterForm({ priceUsd, pricePkr }: Props) {
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [embassyCountry, setEmbassyCountry] = useState("");
  const [embassyCity, setEmbassyCity] = useState("");
  const [arrivalDate, setArrivalDate] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [destinations, setDestinations] = useState("Islamabad, Skardu, Hunza");
  const [travelers, setTravelers] = useState<Traveler[]>([{ ...emptyTraveler }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateTraveler(i: number, patch: Partial<Traveler>) {
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
    setSubmitting(true);
    try {
      const payload = {
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        contact_phone: contactPhone.trim(),
        embassy_country: embassyCountry.trim(),
        embassy_city: embassyCity.trim(),
        arrival_date: arrivalDate,
        departure_date: departureDate,
        destinations: destinations.split(",").map((s) => s.trim()).filter(Boolean),
        travelers,
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
  const inputCls =
    "w-full h-11 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[15px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]";

  return (
    <form onSubmit={onSubmit} className="space-y-8 max-w-3xl">
      <section>
        <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Your contact details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Full name</label>
            <input required value={contactName} onChange={(e) => setContactName(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Email</label>
            <input required type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Phone (with country code)</label>
            <input required type="tel" placeholder="+34 6XX XXX XXX" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Where should we address the letter?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Country of embassy</label>
            <input required placeholder="Spain" value={embassyCountry} onChange={(e) => setEmbassyCountry(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>City</label>
            <input required placeholder="Madrid" value={embassyCity} onChange={(e) => setEmbassyCity(e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Trip details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Arrival date</label>
            <input required type="date" value={arrivalDate} onChange={(e) => setArrivalDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Departure date</label>
            <input required type="date" value={departureDate} onChange={(e) => setDepartureDate(e.target.value)} className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelCls}>Destinations to visit (comma-separated)</label>
            <input required placeholder="Islamabad, Skardu, Hunza" value={destinations} onChange={(e) => setDestinations(e.target.value)} className={inputCls} />
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-bold text-[var(--text-primary)]">Travelers</h2>
          <button type="button" onClick={addTraveler} className="text-[13px] font-semibold text-[var(--primary)] inline-flex items-center gap-1">
            + Add traveler
          </button>
        </div>
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
                <div className="sm:col-span-2">
                  <label className={labelCls}>Full name (as on passport)</label>
                  <input required value={t.full_name} onChange={(e) => updateTraveler(i, { full_name: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Date of birth</label>
                  <input required type="date" value={t.date_of_birth} onChange={(e) => updateTraveler(i, { date_of_birth: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Nationality</label>
                  <input required value={t.nationality} onChange={(e) => updateTraveler(i, { nationality: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Passport number</label>
                  <input required value={t.passport_number} onChange={(e) => updateTraveler(i, { passport_number: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Passport expiry</label>
                  <input required type="date" value={t.passport_expiry} onChange={(e) => updateTraveler(i, { passport_expiry: e.target.value })} className={inputCls} />
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
        <p className="text-[13px] text-[var(--text-tertiary)]">Non-refundable. Letter delivered to your email within 2–3 business days of payment.</p>
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
