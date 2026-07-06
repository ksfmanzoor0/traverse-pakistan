"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { createPackageBooking } from "@/services/booking.service";
import type { Package, PackageTier } from "@/types/package";
import type { Review } from "@/types/review";
import { WizardProgress } from "@/components/booking/WizardProgress";
import { Stepper } from "@/components/booking/Stepper";
import { TrustStrip } from "@/components/booking/TrustStrip";
import { ReviewQuoteCard } from "@/components/booking/ReviewQuoteCard";
import { InlineAlert } from "@/components/ui/InlineAlert";
import { trackAddToCart } from "@/lib/analytics/track";

type DepartureCity = "islamabad" | "lahore" | "karachi";

const STEP_LABELS = ["Dates & Tier", "Travellers", "Your details", "Review"];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDow(y: number, m: number) { return new Date(y, m, 1).getDay(); }
function fmtShort(d: Date) { return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

function CalendarPicker({ value, onChange }: { value: Date | null; onChange: (d: Date) => void }) {
  const today = startOfDay(new Date());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const cells: (Date | null)[] = [
    ...Array(getFirstDow(year, month)).fill(null),
    ...Array.from({ length: getDaysInMonth(year, month) }, (_, i) => new Date(year, month, i + 1)),
  ];

  function prev() { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }
  function next() { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }

  return (
    <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-4" style={{ boxShadow: "var(--shadow-md)" }}>
      <div className="flex items-center justify-between mb-3">
        <button type="button" onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] cursor-pointer text-[var(--text-secondary)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 3L5 8L10 13" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="text-[13px] font-bold text-[var(--text-primary)]">{MONTHS[month]} {year}</span>
        <button type="button" onClick={next} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-subtle)] cursor-pointer text-[var(--text-secondary)]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3L11 8L6 13" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => <div key={d} className="text-center text-[11px] font-semibold text-[var(--text-tertiary)] py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((date, idx) => {
          if (!date) return <div key={`e-${idx}`} />;
          const past = startOfDay(date) < today;
          const selected = value ? isSameDay(date, value) : false;
          return (
            <button
              key={date.toISOString()}
              type="button"
              disabled={past}
              onClick={() => !past && onChange(date)}
              className={[
                "w-8 h-8 mx-auto rounded-full flex items-center justify-center text-[12px] font-medium transition-all cursor-pointer",
                past ? "text-[var(--text-tertiary)] opacity-30 cursor-not-allowed" : "",
                selected ? "bg-[var(--primary)] text-[var(--text-inverse)] font-bold" : "hover:bg-[var(--primary-light)] hover:text-[var(--primary)]",
              ].join(" ")}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight">{title}</h2>
      {sub && <p className="mt-1 text-[13px] text-[var(--text-secondary)] leading-relaxed">{sub}</p>}
    </div>
  );
}

function LabeledInput({
  label, required, value, onChange, type = "text", placeholder, error,
}: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; error?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
        {label}{required && <span className="text-[var(--error)] ml-0.5" aria-hidden>*</span>}
      </label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={required}
        className={`w-full h-11 px-4 border rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 transition-colors ${
          error ? "border-[var(--error)]" : "border-[var(--border-default)] focus:border-[var(--primary)]"
        }`}
      />
      {error && <p className="mt-1 text-[11px] text-[var(--error)] font-medium">{error}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[13px]">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-semibold text-[var(--text-primary)] text-right">{value}</span>
    </div>
  );
}

function validPhone(p: string) { const d = p.replace(/\D/g, ""); return d.length >= 10 && d.length <= 15; }
function validEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

interface WizardState {
  step: 1 | 2 | 3 | 4;
  tier: PackageTier;
  city: DepartureCity;
  startDate: Date | null;
  adults: number;
  rooms: number;
  firstName: string;
  phone: string;
  email: string;
  specialRequests: string;
  paymentPlan: "full" | "installments";
}

const PACKAGE_DEPOSIT_PCT = 0.5;

export function PackageBookingWizard({ pkg, reviews }: { pkg: Package; reviews: Review[] }) {
  const searchParams = useSearchParams();
  const initAdults = Math.max(1, Number(searchParams?.get("adults") ?? 2));
  const initRooms = Math.max(1, Number(searchParams?.get("rooms") ?? Math.ceil(initAdults / 3)));
  const initTier = (searchParams?.get("tier") as "deluxe" | "luxury" | null) ?? "deluxe";
  const defaultCity = pkg.tiers.deluxe.islamabad !== null ? "islamabad" : pkg.tiers.deluxe.lahore !== null ? "lahore" : "karachi";
  const initCity = (searchParams?.get("city") as "islamabad" | "lahore" | "karachi" | null) ?? defaultCity;
  const initCheckinParam = searchParams?.get("checkin") ?? null;
  // Parse YYYY-MM-DD as a local date (avoid the UTC drift `new Date("YYYY-MM-DD")`
  // gives in negative-UTC time zones).
  const initStartDate: Date | null = (() => {
    if (!initCheckinParam) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(initCheckinParam);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  })();
  const initStep = searchParams?.get("adults") ? 3 : 1;

  const [state, setState] = useState<WizardState>({
    step: initStep as 1 | 2 | 3 | 4,
    tier: initTier,
    city: initCity,
    startDate: initStartDate,
    adults: initAdults,
    rooms: initRooms,
    firstName: "",
    phone: "",
    email: "",
    specialRequests: "",
    paymentPlan: "full",
  });
  const [maxReached, setMaxReached] = useState(initStep);
  const [error, setError] = useState<string | null>(null);
  const [attemptedNext, setAttemptedNext] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // Stable per-attempt UUID so retries (manual double-click or auto) dedup
  // on the server instead of creating duplicate bookings.
  const submitUuidRef = useRef<string>(crypto.randomUUID());
  const router = useRouter();

  const pricing = pkg.tiers[state.tier];
  const staticPerPerson =
    state.city === "lahore" && pricing.lahore ? pricing.lahore :
    state.city === "karachi" && pricing.karachi ? pricing.karachi :
    (pricing.islamabad ?? pricing.lahore ?? pricing.karachi ?? 0);

  const defaultRooms = Math.ceil(state.adults / 3);
  const extraRooms = Math.max(0, state.rooms - defaultRooms);
  const roomSurcharge = extraRooms * (pricing.singleSupplement ?? 0);
  const staticTotal = staticPerPerson * state.adults + roomSurcharge;

  // Engine-driven quote — same endpoint the sidebar uses so checkout shows
  // the same number quoted at booking time (jeep legs + meals + entries +
  // LHE extension + min-rooms allocation). Falls back to staticTotal while
  // loading or if the engine returns an unresolved combo.
  const [engineQuote, setEngineQuote] = useState<{ total: number; perPerson: number } | null>(null);
  const requestSeqRef = useRef(0);
  useEffect(() => {
    const mySeq = ++requestSeqRef.current;
    const home = state.city === "lahore" ? "LHE" : state.city === "karachi" ? "KHI" : "ISB";
    const start = state.startDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
    const params = new URLSearchParams({
      home,
      tier: state.tier,
      pax: String(state.adults),
      startDate,
      rooms: String(state.rooms),
    });
    const controller = new AbortController();
    fetch(`/api/packages/${pkg.slug}/quote?${params.toString()}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: { total: number; perPerson: number; unresolved?: string[] }) => {
        if (mySeq !== requestSeqRef.current) return;
        if ((j.unresolved && j.unresolved.length > 0) || !(j.perPerson > 0)) {
          setEngineQuote(null);
          return;
        }
        setEngineQuote({ total: j.total, perPerson: j.perPerson });
      })
      .catch((err) => {
        if (mySeq !== requestSeqRef.current) return;
        if ((err as Error).name === "AbortError") return;
        setEngineQuote(null);
      });
    return () => controller.abort();
  }, [pkg.slug, state.tier, state.city, state.adults, state.rooms, state.startDate]);

  const pricePerPerson = engineQuote?.perPerson ?? staticPerPerson;
  const total = engineQuote?.total ?? staticTotal;

  const endDate = state.startDate
    ? new Date(state.startDate.getFullYear(), state.startDate.getMonth(), state.startDate.getDate() + pkg.duration - 1)
    : null;

  const nights = pkg.duration - 1;

  function patch(p: Partial<WizardState>) { setState(s => ({ ...s, ...p })); }

  function validateStep(step: number): string | null {
    if (step === 1 && !state.startDate) return "Please select a start date to continue";
    if (step === 2 && state.adults < 1) return "At least 1 adult is required";
    if (step === 3) {
      if (!state.firstName.trim()) return "Name is required";
      if (!validPhone(state.phone)) return "Enter a valid phone number";
      if (state.email && !validEmail(state.email)) return "Enter a valid email address";
    }
    return null;
  }

  function goToStep(next: number) {
    if (next > state.step) {
      const err = validateStep(state.step);
      if (err) { setAttemptedNext(true); setError(err); return; }
    }
    setError(null);
    setAttemptedNext(false);
    patch({ step: next as 1 | 2 | 3 | 4 });
    setMaxReached(m => Math.max(m, next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    const err = validateStep(3);
    if (err) { setAttemptedNext(true); setError(err); goToStep(3); return; }
    setSubmitting(true);
    setError(null);
    const input = {
      packageSlug: pkg.slug,
      tier: state.tier,
      departureCity: state.city,
      startDate: state.startDate ? state.startDate.toISOString().slice(0, 10) : null,
      adults: state.adults,
      rooms: state.rooms,
      totalAmount: total,
      contact: {
        name: state.firstName.trim(),
        email: state.email,
        phone: state.phone,
      },
      notes: state.specialRequests || undefined,
      submitUuid: submitUuidRef.current,
      paymentPlan: state.paymentPlan,
    };
    // Up to 3 attempts on network-ish failures. Server dedups by submitUuid
    // so retries are safe — at most one row created per attempt UUID.
    const isNetworkError = (e: unknown) => {
      const msg = e instanceof Error ? e.message.toLowerCase() : "";
      return msg.includes("load failed") || msg.includes("network") || msg.includes("fetch");
    };
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await createPackageBooking(input);
        trackAddToCart({
          bookingRef: result.bookingRef,
          bookingType: "package",
          itemId: pkg.slug,
          itemName: pkg.name,
          totalAmount: result.totalAmount,
          tier: state.tier,
          paymentPlan: state.paymentPlan,
        });
        router.push(`/packages/${pkg.slug}/checkout/success?ref=${result.bookingRef}&amount=${result.totalAmount}&plan=${state.paymentPlan}`);
        return;
      } catch (e) {
        lastErr = e;
        if (!isNetworkError(e) || attempt === 2) break;
        setError("Connection issue — retrying…");
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    const msg = lastErr instanceof Error ? lastErr.message : "";
    setError(
      isNetworkError(lastErr)
        ? "We couldn't reach the server. Please check your connection and try again, or contact us on WhatsApp at +92 321 6650670."
        : msg || "Booking failed. Please try again."
    );
    setSubmitting(false);
  }

  const validationError = attemptedNext ? validateStep(state.step) : null;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
      <div className="space-y-7">
        <WizardProgress
          step={state.step}
          totalSteps={4}
          labels={STEP_LABELS}
          maxReachedStep={maxReached}
          onJump={goToStep}
        />

        {/* Step 1 — Dates & Tier */}
        {state.step === 1 && (
          <section className="space-y-6">
            <SectionHeader title="Dates & package tier" sub="Choose your travel dates, tier, and departure city." />

            {/* Tier */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">Package tier</label>
              <div className="grid grid-cols-2 gap-3">
                {(["deluxe", "luxury"] as PackageTier[]).map(tier => (
                  <button
                    key={tier} type="button" onClick={() => {
                      const cap = pkg.maxAdultsByTier?.[tier] ?? pkg.maxGroupSize;
                      patch({ tier, adults: Math.min(state.adults, cap) });
                    }}
                    className={`h-14 rounded-[var(--radius-sm)] border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                      state.tier === tier
                        ? "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary)]"
                        : "border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--primary)]"
                    }`}
                  >
                    <span className="text-[14px] font-bold capitalize">{tier}</span>
                    <span className="text-[12px] opacity-80">{formatPrice(pkg.tiers[tier].islamabad ?? pkg.tiers[tier].lahore ?? 0)} / person</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Departure city */}
            {(pricing.lahore || pricing.karachi) && (
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">Departure city</label>
                <div className={`grid gap-3 ${pricing.karachi ? "grid-cols-3" : "grid-cols-2"}`}>
                  {(["islamabad", "lahore", "karachi"] as DepartureCity[])
                    .filter(c => pricing[c] !== null)
                    .map(city => (
                      <button
                        key={city} type="button" onClick={() => patch({ city })}
                        className={`h-12 rounded-[var(--radius-sm)] border transition-all cursor-pointer capitalize text-[14px] font-semibold ${
                          state.city === city
                            ? "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary)]"
                            : "border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--primary)]"
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Date picker */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">Start date</label>
              {state.startDate ? (
                <div className="flex items-center justify-between p-4 rounded-[var(--radius-sm)] border border-[var(--primary)] bg-[var(--primary-light)]">
                  <div>
                    <p className="text-[15px] font-bold text-[var(--text-primary)]">{fmtShort(state.startDate)}</p>
                    {endDate && (
                      <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                        {nights} nights · ends {fmtShort(endDate)}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => patch({ startDate: null })} className="text-[12px] text-[var(--text-tertiary)] underline cursor-pointer hover:text-[var(--text-primary)]">
                    Change
                  </button>
                </div>
              ) : (
                <CalendarPicker value={state.startDate} onChange={d => patch({ startDate: d })} />
              )}
            </div>
          </section>
        )}

        {/* Step 2 — Travellers */}
        {state.step === 2 && (() => {
          const tierCap = pkg.maxAdultsByTier?.[state.tier];
          const effectiveMax = Math.min(pkg.maxGroupSize, tierCap ?? pkg.maxGroupSize);
          return (
          <section className="space-y-6">
            <SectionHeader
              title="Who's travelling?"
              sub={tierCap && tierCap < pkg.maxGroupSize
                ? `Up to ${effectiveMax} travellers on ${state.tier} tier (${pkg.maxGroupSize} on other tiers) · up to 3 per room`
                : `Up to ${effectiveMax} travellers · up to 3 per room`}
            />
            <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 space-y-5">
              <Stepper
                label="Adults"
                sub="Age 13 and over"
                value={state.adults}
                min={1}
                max={effectiveMax}
                onDecrement={() => {
                  const next = Math.max(1, state.adults - 1);
                  patch({ adults: next, rooms: Math.min(state.rooms, Math.ceil(next / 3)) });
                }}
                onIncrement={() => {
                  const next = Math.min(effectiveMax, state.adults + 1);
                  patch({ adults: next, rooms: Math.max(state.rooms, Math.ceil(next / 3)) });
                }}
              />
              <div className="border-t border-[var(--border-default)]" />
              <Stepper
                label="Rooms"
                sub={state.rooms > defaultRooms ? `+${formatPrice(roomSurcharge)} single supplement` : "Up to 3 per room — no extra charge"}
                value={state.rooms}
                min={defaultRooms}
                max={state.adults}
                onDecrement={() => patch({ rooms: Math.max(defaultRooms, state.rooms - 1) })}
                onIncrement={() => patch({ rooms: Math.min(state.adults, state.rooms + 1) })}
              />
            </div>
          </section>
          );
        })()}

        {/* Step 3 — Details */}
        {state.step === 3 && (
          <section className="space-y-6">
            <SectionHeader title="Your details" sub="We'll use these to confirm your booking." />
            <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
              <p className="text-[13px] font-bold uppercase tracking-wider text-[var(--primary)] mb-3">Lead contact</p>
              <div className="space-y-4">
                <LabeledInput label="Name" required value={state.firstName} onChange={v => patch({ firstName: v })} placeholder="Ali Khan" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <LabeledInput label="Phone" required type="tel" value={state.phone} onChange={v => patch({ phone: v })} placeholder="+92 300 0000000"
                    error={state.phone && !validPhone(state.phone) ? "Enter a valid phone" : undefined} />
                  <LabeledInput label="Email" type="email" value={state.email} onChange={v => patch({ email: v })} placeholder="ali@example.com"
                    error={state.email && !validEmail(state.email) ? "Enter a valid email" : undefined} />
                </div>
              </div>
            </div>
            <div>
              <label className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)] block mb-2">Special requests · optional</label>
              <textarea
                rows={3} maxLength={500} value={state.specialRequests}
                onChange={e => patch({ specialRequests: e.target.value })}
                placeholder="Dietary needs, room preferences, anything we should know…"
                className="w-full px-4 py-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors resize-none"
              />
            </div>
          </section>
        )}

        {/* Step 4 — Review */}
        {state.step === 4 && (
          <section className="space-y-6">
            <SectionHeader title="Review & confirm" sub="Our team will confirm availability and send a secure payment link." />

            <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 space-y-3">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Package</p>
              <p className="text-[16px] font-bold text-[var(--text-primary)]">{pkg.name}</p>
              <div className="grid grid-cols-2 gap-y-2 text-[13px]">
                <span className="text-[var(--text-tertiary)]">Tier</span>
                <span className="text-right text-[var(--text-primary)] font-medium capitalize">{state.tier}</span>
                <span className="text-[var(--text-tertiary)]">Departure city</span>
                <span className="text-right text-[var(--text-primary)] font-medium capitalize">{state.city}</span>
                <span className="text-[var(--text-tertiary)]">Start date</span>
                <span className="text-right text-[var(--text-primary)] font-medium">
                  {state.startDate ? fmtShort(state.startDate) : "Flexible"}
                </span>
                <span className="text-[var(--text-tertiary)]">Duration</span>
                <span className="text-right text-[var(--text-primary)] font-medium">{pkg.duration} days / {nights} nights</span>
                <span className="text-[var(--text-tertiary)]">Travellers</span>
                <span className="text-right text-[var(--text-primary)] font-medium">{state.adults} adult{state.adults !== 1 ? "s" : ""}</span>
                <span className="text-[var(--text-tertiary)]">Rooms</span>
                <span className="text-right text-[var(--text-primary)] font-medium">{state.rooms}</span>
              </div>
            </div>

            {/* Price breakdown */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 space-y-2">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-3">Price breakdown</p>
              <SummaryRow label={`${formatPrice(pricePerPerson)} × ${state.adults} person${state.adults !== 1 ? "s" : ""}`} value={formatPrice(pricePerPerson * state.adults)} />
              {roomSurcharge > 0 && (
                <SummaryRow label={`${extraRooms} extra room supplement`} value={`+${formatPrice(roomSurcharge)}`} />
              )}
              <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-[var(--border-default)]">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(total)}</span>
              </div>
            </div>

            {/* Payment plan */}
            <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
              <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)] mb-3">Payment plan</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => patch({ paymentPlan: "full" })}
                  className={`text-left p-3 rounded-[var(--radius-sm)] border-2 transition-all cursor-pointer ${
                    state.paymentPlan === "full"
                      ? "border-[var(--primary)] bg-[var(--primary-light)]"
                      : "border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--primary)]"
                  }`}
                >
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">Pay in full</p>
                  <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 tabular-nums">{formatPrice(total)}</p>
                </button>
                {(() => {
                  const depositNow = Math.round(total * PACKAGE_DEPOSIT_PCT);
                  const depositLater = total - depositNow;
                  return (
                    <button
                      type="button"
                      onClick={() => patch({ paymentPlan: "installments" })}
                      className={`text-left p-3 rounded-[var(--radius-sm)] border-2 transition-all cursor-pointer ${
                        state.paymentPlan === "installments"
                          ? "border-[var(--primary)] bg-[var(--primary-light)]"
                          : "border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--primary)]"
                      }`}
                    >
                      <p className="text-[13px] font-bold text-[var(--text-primary)]">50% deposit</p>
                      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 tabular-nums">{formatPrice(depositNow)} now · {formatPrice(depositLater)} later</p>
                    </button>
                  );
                })()}
              </div>
              {state.paymentPlan === "installments" && (
                <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                  Balance due 30 days before trip start. No interest, no fees.
                </p>
              )}
            </div>

          </section>
        )}

        {(validationError || error) && <InlineAlert>{validationError ?? error}</InlineAlert>}

        {/* Nav buttons */}
        <div className="flex items-center gap-3 pt-2">
          {state.step > 1 && (
            <button type="button" onClick={() => goToStep(state.step - 1)}
              className="h-[48px] px-5 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer">
              Back
            </button>
          )}
          {state.step < 4 && (
            <button type="button" onClick={() => goToStep(state.step + 1)}
              className="flex-1 h-[48px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors active:scale-[0.98] cursor-pointer">
              Continue
            </button>
          )}
          {state.step === 4 && (
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="flex-1 h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors active:scale-[0.98] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? "Confirming…" : "Confirm booking"}
            </button>
          )}
        </div>

        {state.step === 4 && (
          <p className="text-center text-[11px] text-[var(--text-tertiary)] -mt-4">
            You won&apos;t be charged yet — our team will confirm availability first.
          </p>
        )}

        {state.step >= 2 && <TrustStrip variant="grid" showSecurePayment />}
        {state.step >= 3 && reviews.length > 0 && <ReviewQuoteCard reviews={reviews} />}
      </div>

      {/* Sidebar summary */}
      <aside className="mt-8 lg:mt-0">
        <div className="sticky top-[100px] bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
          <div className="relative aspect-[16/9]">
            {pkg.images[0]?.url && <Image src={pkg.images[0].url} alt={pkg.name} fill className="object-cover" sizes="380px" />}
            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/80 capitalize">{state.tier} tier</p>
              <h3 className="text-[16px] font-bold text-white leading-snug mt-0.5">{pkg.name}</h3>
            </div>
          </div>
          <div className="p-5 space-y-3 text-[13px]">
            <SummaryRow label="Tier" value={state.tier.charAt(0).toUpperCase() + state.tier.slice(1)} />
            <SummaryRow label="City" value={state.city.charAt(0).toUpperCase() + state.city.slice(1)} />
            <SummaryRow label="Start date" value={state.startDate ? fmtShort(state.startDate) : "Not selected"} />
            <SummaryRow label="Duration" value={`${pkg.duration} days`} />
            <SummaryRow label="Adults" value={`${state.adults}`} />
            <SummaryRow label="Rooms" value={`${state.rooms}`} />
            <div className="border-t border-[var(--border-default)] pt-3 flex justify-between text-[15px] font-bold">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
