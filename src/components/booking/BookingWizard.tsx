"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { formatPrice, getWhatsAppUrl } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createBooking, getNextOpenDeparture } from "@/services/booking.service";
import type { Departure, DepartureCity } from "@/types/booking";
import type { Tour } from "@/types/tour";
import type { Review } from "@/types/review";
import { WizardProgress } from "./WizardProgress";
import { Stepper } from "./Stepper";
import { TravelerCard } from "./TravelerCard";
import { UrgencyStrip } from "./UrgencyStrip";
import { TrustStrip } from "./TrustStrip";
import { ReviewQuoteCard } from "./ReviewQuoteCard";
import { PriceBreakdown } from "./PriceBreakdown";
import { FAQInline } from "./FAQInline";
import { ExitIntentDialog } from "./ExitIntentDialog";
import { calculatePricing, type PaymentPlan } from "./pricing";
import { deriveUrgency } from "./urgency";
import type { TravelerProfile } from "./types";
import { useCheckoutDraft } from "@/hooks/useCheckoutDraft";

const STEP_LABELS = ["Dates", "Travellers", "Your details", "Review"];

export interface BookingWizardProps {
  tour: Tour;
  reviews: Review[];
  onClose?: () => void;
  compact?: boolean;
}

function fmtLongDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });
}

function validPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}
function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ensureTravelers(
  travelers: TravelerProfile[],
  adults: number,
  childCount: number,
): TravelerProfile[] {
  const next: TravelerProfile[] = [];
  for (let i = 0; i < adults; i++) {
    const existing = travelers.find((t) => t.ageGroup === "adult" && next.filter((n) => n.ageGroup === "adult").length === i && !next.includes(t));
    next.push(
      existing ?? {
        fullName: "",
        ageGroup: "adult",
        isLead: i === 0,
        dateOfBirth: undefined,
        cnicOrPassport: undefined,
        dietary: undefined,
        emergencyContact: undefined,
      }
    );
  }
  for (let i = 0; i < childCount; i++) {
    const existing = travelers.find((t) => t.ageGroup === "child" && next.filter((n) => n.ageGroup === "child").length === i && !next.includes(t));
    next.push(
      existing ?? {
        fullName: "",
        ageGroup: "child",
        isLead: false,
        dateOfBirth: undefined,
      }
    );
  }
  if (next.length > 0 && !next.some((t) => t.isLead)) next[0].isLead = true;
  return next;
}

export function BookingWizard({ tour, reviews, onClose, compact }: BookingWizardProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initDeparture = (searchParams?.get("departure") ?? "islamabad") as DepartureCity;
  const initAdults = Math.max(1, Number(searchParams?.get("adults") ?? 2));
  const initChildren = Math.max(0, Number(searchParams?.get("children") ?? 0));
  const initSingleRooms = Math.max(0, Number(searchParams?.get("singleRooms") ?? 0));

  const { draft, setDraft, clearDraft } = useCheckoutDraft(tour.slug, {
    departureCity: initDeparture,
    adults: initAdults,
    childCount: initChildren,
    singleRooms: initSingleRooms,
  });

  const [cityDepartures, setCityDepartures] = useState<{ islamabad: Departure | null; lahore: Departure | null; karachi: Departure | null }>({ islamabad: null, lahore: null, karachi: null });
  const [departuresLoaded, setDeparturesLoaded] = useState(false);
  const [maxReachedStep, setMaxReachedStep] = useState<number>(draft.step);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [whatsappSubmitted, setWhatsappSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptedNext, setAttemptedNext] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    Promise.all([
      getNextOpenDeparture(tour.slug, "islamabad"),
      getNextOpenDeparture(tour.slug, "lahore"),
      getNextOpenDeparture(tour.slug, "karachi"),
    ])
      .then(([isb, lhr, khi]) => {
        if (!cancelled) {
          setCityDepartures({ islamabad: isb, lahore: lhr, karachi: khi });
          setDeparturesLoaded(true);
        }
      })
      .catch(() => { if (!cancelled) setDeparturesLoaded(true); });
    return () => { cancelled = true; };
  }, [tour.slug]);

  const liveDeparture = cityDepartures[draft.departureCity as "islamabad" | "lahore" | "karachi"] ?? null;

  useEffect(() => {
    setDraft((d) => ({
      ...d,
      travelers: ensureTravelers(d.travelers, d.adults, d.childCount),
    }));
  }, [draft.adults, draft.childCount, setDraft]);

  const pricing = useMemo(
    () => calculatePricing({
      tour,
      liveDeparture,
      departureCity: draft.departureCity,
      adults: draft.adults,
      childCount: draft.childCount,
      singleRooms: draft.singleRooms,
      paymentPlan: draft.paymentPlan,
    }),
    [tour, liveDeparture, draft.departureCity, draft.adults, draft.childCount, draft.singleRooms, draft.paymentPlan],
  );

  const urgency = useMemo(() => deriveUrgency(tour, liveDeparture), [tour, liveDeparture]);

  const departureDateDisplay = liveDeparture?.departureDate ?? tour.departureDate;
  const maxSeats = liveDeparture?.maxSeats ?? tour.maxGroupSize;
  const seatsLeft = liveDeparture?.seatsAvailable ?? null;

  function patch(p: Partial<typeof draft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function patchContact(p: Partial<typeof draft.contact>) {
    setDraft((d) => ({ ...d, contact: { ...d.contact, ...p } }));
  }

  function patchTraveler(index: number, p: Partial<TravelerProfile>) {
    setDraft((d) => {
      const next = d.travelers.slice();
      next[index] = { ...next[index], ...p };
      return { ...d, travelers: next };
    });
  }

  useEffect(() => {
    if (draft.contact.firstName || draft.contact.lastName) {
      const leadIdx = draft.travelers.findIndex((t) => t.isLead);
      if (leadIdx >= 0) {
        const combined = `${draft.contact.firstName} ${draft.contact.lastName}`.trim();
        if (combined && draft.travelers[leadIdx].fullName === "") {
          patchTraveler(leadIdx, { fullName: combined });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.contact.firstName, draft.contact.lastName]);

  const totalTravelers = draft.adults + draft.childCount;
  const hasCapacity = liveDeparture ? liveDeparture.seatsAvailable >= totalTravelers : true;

  function validateStep(step: number): string | null {
    if (step === 1) {
      if (!departureDateDisplay) return "Pick a departure to continue";
      return null;
    }
    if (step === 2) {
      if (draft.adults < 1) return "At least 1 adult is required";
      if (totalTravelers > maxSeats) return `Max group size is ${maxSeats}`;
      if (liveDeparture && liveDeparture.seatsAvailable < totalTravelers) {
        return `Only ${liveDeparture.seatsAvailable} seats left on this departure`;
      }
      return null;
    }
    if (step === 3) {
      if (!draft.contact.firstName.trim()) return "Lead traveller first name required";
      if (!validPhone(draft.contact.phone)) return "Enter a valid phone number";
      if (draft.contact.email && !validEmail(draft.contact.email)) return "Enter a valid email";
      return null;
    }
    return null;
  }

  function goToStep(next: number) {
    if (next > draft.step) {
      const err = validateStep(draft.step);
      if (err) {
        setAttemptedNext(true);
        setError(err);
        return;
      }
    }
    setError(null);
    setAttemptedNext(false);
    setDraft((d) => ({ ...d, step: next as 1 | 2 | 3 | 4 }));
    setMaxReachedStep((m) => Math.max(m, next));
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function buildWhatsAppMessage() {
    const lines = [
      `Hi! I'd like to book the "${tour.name}" tour.`,
      "",
      `*Tour:* ${tour.name}`,
      `*Departure:* ${draft.departureCity === "lahore" ? "Lahore" : "Islamabad"}`,
      departureDateDisplay ? `*Date:* ${fmtLongDate(departureDateDisplay)}` : null,
      `*Duration:* ${tour.duration} days`,
      `*Adults:* ${draft.adults}`,
      draft.childCount > 0 ? `*Children:* ${draft.childCount}` : null,
      draft.singleRooms > 0 ? `*Single rooms:* ${draft.singleRooms}` : null,
      `*Total:* ${formatPrice(pricing.total)}`,
      draft.paymentPlan === "installments" ? `*Payment:* 20% deposit (${formatPrice(pricing.dueNow)} now)` : null,
      "",
      `*Lead traveller:*`,
      `${draft.contact.firstName} ${draft.contact.lastName}`,
      draft.contact.email,
      draft.contact.phone,
      "",
      `*All travellers:*`,
      ...draft.travelers.map((t, i) =>
        `${i + 1}. ${t.fullName || "(name missing)"} · ${t.ageGroup}${t.dateOfBirth ? ` · DOB ${t.dateOfBirth}` : ""}`
      ),
      draft.specialRequests ? `\n*Special requests:* ${draft.specialRequests}` : null,
      "",
      `Please confirm availability.`,
    ].filter(Boolean);
    return lines.join("\n");
  }

  async function handleCardPayment() {
    setError(null);
    const err = validateStep(3);
    if (err) {
      setAttemptedNext(true);
      setError(err);
      goToStep(3);
      return;
    }
    if (!liveDeparture) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/payments/alfa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking: {
            departureId: liveDeparture.id,
            seats: totalTravelers,
            singleRooms: draft.singleRooms,
            contact: {
              name: `${draft.contact.firstName} ${draft.contact.lastName}`.trim(),
              email: draft.contact.email,
              phone: draft.contact.phone,
            },
            participants: draft.travelers.map((t) => ({
              fullName: t.fullName,
              dateOfBirth: t.dateOfBirth,
              cnicOrPassport: t.cnicOrPassport,
              dietary: t.dietary,
              emergencyContact: t.emergencyContact,
            })),
            notes: draft.specialRequests || undefined,
          },
          amount: pricing.dueNow,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment initiation failed");
      clearDraft();
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.ssoUrl;
      for (const [key, value] of Object.entries(data.ssoParams as Record<string, string>)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment initiation failed. Please try again.");
      setSubmitting(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    const err = validateStep(3);
    if (err) {
      setAttemptedNext(true);
      setError(err);
      goToStep(3);
      return;
    }

    if (isSupabaseConfigured && liveDeparture && hasCapacity) {
      setSubmitting(true);
      try {
        const result = await createBooking({
          departureId: liveDeparture.id,
          seats: totalTravelers,
          singleRooms: draft.singleRooms,
          contact: {
            name: `${draft.contact.firstName} ${draft.contact.lastName}`.trim(),
            email: draft.contact.email,
            phone: draft.contact.phone,
          },
          participants: draft.travelers.map((t) => ({
            fullName: t.fullName,
            dateOfBirth: t.dateOfBirth,
            cnicOrPassport: t.cnicOrPassport,
            dietary: t.dietary,
            emergencyContact: t.emergencyContact,
          })),
          notes: draft.specialRequests || undefined,
        });
        setSubmittedRef(result.bookingRef);
        clearDraft();
        router.push(`/grouptours/${tour.slug}/checkout/success?ref=${result.bookingRef}&plan=${draft.paymentPlan}`);
        return;
      } catch (e) {
        setError(e instanceof Error ? e.message : "We couldn't reserve that seat. Please try again or chat on WhatsApp.");
        setSubmitting(false);
        return;
      }
    }

    window.open(getWhatsAppUrl(buildWhatsAppMessage()), "_blank");
    setWhatsappSubmitted(true);
  }

  if (whatsappSubmitted) {
    return <WhatsAppSentCard tour={tour} onClose={onClose} />;
  }

  if (submittedRef) {
    return (
      <div className="p-6 rounded-[var(--radius-md)] bg-[var(--primary-light)] border border-[var(--primary)]/30 text-center">
        <p className="text-[16px] font-bold text-[var(--primary-deep)]">Reserved!</p>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          Reference <span className="font-mono font-semibold">{submittedRef}</span>
        </p>
      </div>
    );
  }

  const validationError = attemptedNext ? validateStep(draft.step) : null;

  return (
    <div className={compact ? "" : "lg:grid lg:grid-cols-[1fr_380px] lg:gap-10"}>
      <div className="space-y-7">
        <WizardProgress
          step={draft.step}
          totalSteps={4}
          labels={STEP_LABELS}
          maxReachedStep={maxReachedStep}
          onJump={goToStep}
        />

        {urgency && !compact && (
          <div className="rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-default)] px-4 py-3">
            <UrgencyStrip signals={urgency} />
          </div>
        )}

        {draft.step === 1 && (
          <StepDates
            tour={tour}
            liveDeparture={liveDeparture}
            cityDepartures={cityDepartures}
            departuresLoaded={departuresLoaded}
            departureCity={draft.departureCity}
            onCityChange={(city) => patch({ departureCity: city })}
            departureDate={departureDateDisplay}
            seatsLeft={seatsLeft}
          />
        )}

        {draft.step === 2 && (
          <StepTravelers
            tour={tour}
            adults={draft.adults}
            childCount={draft.childCount}
            singleRooms={draft.singleRooms}
            maxSeats={maxSeats}
            seatsLeft={seatsLeft}
            groupDiscountPct={pricing.groupDiscountPct}
            onAdults={(n) => patch({ adults: n })}
            onChildren={(n) => patch({ childCount: n })}
            onSingleRooms={(n) => patch({ singleRooms: n })}
          />
        )}

        {draft.step === 3 && (
          <StepDetails
            contact={draft.contact}
            onContactChange={patchContact}
            travelers={draft.travelers}
            onTravelerChange={patchTraveler}
          />
        )}

        {draft.step === 4 && (
          <StepReview
            tour={tour}
            pricing={pricing}
            adults={draft.adults}
            childCount={draft.childCount}
            departureCity={draft.departureCity}
            departureDate={departureDateDisplay}
            paymentPlan={draft.paymentPlan}
            onPaymentPlanChange={(plan) => patch({ paymentPlan: plan })}
            specialRequests={draft.specialRequests}
            onSpecialRequests={(v) => patch({ specialRequests: v })}
            travelers={draft.travelers}
          />
        )}

        {validationError && (
          <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-[var(--radius-sm)] text-[13px] text-[var(--error)] font-medium">
            {validationError}
          </div>
        )}

        {error && (
          <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-[var(--radius-sm)] text-[13px] text-[var(--error)] font-medium">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-2">
          {draft.step > 1 && (
            <button
              type="button"
              onClick={() => goToStep(draft.step - 1)}
              className="h-[48px] px-5 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
            >
              Back
            </button>
          )}
          {draft.step < 4 && (
            <button
              type="button"
              onClick={() => goToStep(draft.step + 1)}
              className="flex-1 h-[48px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors active:scale-[0.98] cursor-pointer"
            >
              Continue
            </button>
          )}
          {draft.step === 4 && (
            <button
              type="button"
              onClick={isSupabaseConfigured && liveDeparture && hasCapacity ? handleCardPayment : handleSubmit}
              disabled={submitting}
              className="flex-1 h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              {submitting
                ? "Processing…"
                : isSupabaseConfigured && liveDeparture && hasCapacity
                  ? <>Pay with Card · <span className="tabular-nums">{formatPrice(pricing.dueNow)}</span></>
                  : "Confirm via WhatsApp"}
            </button>
          )}
        </div>

        {draft.step === 4 && (
          <p className="text-center text-[11px] text-[var(--text-tertiary)] -mt-4">
            {isSupabaseConfigured && liveDeparture && hasCapacity
              ? "You'll be redirected to a secure Bank Alfalah payment page."
              : "You won't be charged yet — our team will confirm availability first."}
          </p>
        )}

        {draft.step >= 2 && <TrustStrip variant="grid" showSecurePayment />}
        {draft.step >= 3 && reviews.length > 0 && <ReviewQuoteCard reviews={reviews} />}
        {draft.step === 4 && <FAQInline tour={tour} />}

        <p className="text-center text-[11px] text-[var(--text-tertiary)] pt-2">
          Prefer to chat?{" "}
          <a
            href={getWhatsAppUrl(`Hi! Question about "${tour.name}" before booking.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--primary)] hover:underline"
          >
            WhatsApp our team
          </a>{" "}
          · typical reply in 1 hour
        </p>
      </div>

      {!compact && (
        <aside>
          <SummaryCard
            tour={tour}
            departureCity={draft.departureCity}
            departureDate={departureDateDisplay}
            adults={draft.adults}
            childCount={draft.childCount}
            pricing={pricing}
            paymentPlan={draft.paymentPlan}
            onPaymentPlanChange={(plan) => patch({ paymentPlan: plan })}
          />
        </aside>
      )}

      <ExitIntentDialog tourName={tour.name} storageKey={tour.slug} />
    </div>
  );
}

function StepDates({
  tour,
  liveDeparture,
  cityDepartures,
  departuresLoaded,
  departureCity,
  onCityChange,
  departureDate,
  seatsLeft,
}: {
  tour: Tour;
  liveDeparture: Departure | null;
  cityDepartures: { islamabad: Departure | null; lahore: Departure | null; karachi: Departure | null };
  departuresLoaded: boolean;
  departureCity: DepartureCity;
  onCityChange: (city: DepartureCity) => void;
  departureDate: string | null;
  seatsLeft: number | null;
}) {
  const availableCities = (["islamabad", "lahore", "karachi"] as const).filter((c) =>
    departuresLoaded ? cityDepartures[c] !== null : c !== "karachi" && !!tour.pricing.lahore,
  );

  return (
    <section className="space-y-6">
      <SectionHeader title="When are you travelling?" sub="Pick your departure city. Dates below are our next confirmed group departure." />

      {availableCities.length >= 2 && (
        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
            Departure city
          </label>
          <div className={`grid gap-3 ${availableCities.length === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
            {availableCities.map((city) => {
              const active = departureCity === city;
              const dep = cityDepartures[city];
              const price = dep?.price ?? (city === "lahore" ? (tour.pricing.lahore ?? tour.pricing.islamabad) : tour.pricing.islamabad);
              return (
                <button
                  key={city}
                  type="button"
                  onClick={() => onCityChange(city)}
                  className={`text-left p-4 rounded-[var(--radius-sm)] border-2 transition-all cursor-pointer ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-light)]"
                      : "border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--primary)]"
                  }`}
                >
                  <p className="text-[15px] font-bold text-[var(--text-primary)] capitalize">{city}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{formatPrice(price)} per person</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <label className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
          Departure date
        </label>
        <div className="flex items-center justify-between p-4 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-subtle)]">
          <div>
            <p className="text-[16px] font-bold text-[var(--text-primary)]">
              {departureDate ? fmtLongDate(departureDate) : "Flexible"}
            </p>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
              {tour.duration} days · returns {departureDate ? fmtLongDate(new Date(new Date(departureDate).getTime() + tour.duration * 24 * 3600 * 1000).toISOString()) : "—"}
            </p>
          </div>
          {liveDeparture && seatsLeft !== null && (
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                seatsLeft <= 4 && seatsLeft > 0
                  ? "bg-[var(--error)]/10 text-[var(--error)]"
                  : "bg-[var(--primary-light)] text-[var(--primary-deep)]"
              }`}
            >
              {seatsLeft > 0 ? `${seatsLeft} seats left` : "Sold out"}
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-2">
          Need a different date? Chat with us — we run this route on request.
        </p>
      </div>
    </section>
  );
}

function StepTravelers({
  tour,
  adults,
  childCount,
  singleRooms,
  maxSeats,
  seatsLeft,
  groupDiscountPct,
  onAdults,
  onChildren,
  onSingleRooms,
}: {
  tour: Tour;
  adults: number;
  childCount: number;
  singleRooms: number;
  maxSeats: number;
  seatsLeft: number | null;
  groupDiscountPct: number;
  onAdults: (n: number) => void;
  onChildren: (n: number) => void;
  onSingleRooms: (n: number) => void;
}) {
  const totalTravelers = adults + childCount;
  const seatCap = seatsLeft !== null ? Math.min(maxSeats, seatsLeft) : maxSeats;

  return (
    <section className="space-y-6">
      <SectionHeader title="Who's travelling?" sub={`Up to ${maxSeats} travellers per group · children ages 2–12 get 50% off`} />

      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 space-y-5">
        <Stepper
          label="Adults"
          sub="Age 13 and over"
          value={adults}
          min={1}
          max={seatCap - childCount}
          onDecrement={() => onAdults(Math.max(1, adults - 1))}
          onIncrement={() => onAdults(Math.min(seatCap - childCount, adults + 1))}
        />
        <div className="border-t border-[var(--border-default)]" />
        <Stepper
          label="Children"
          sub="Ages 2–12 · 50% off"
          value={childCount}
          min={0}
          max={seatCap - adults}
          onDecrement={() => onChildren(Math.max(0, childCount - 1))}
          onIncrement={() => onChildren(Math.min(seatCap - adults, childCount + 1))}
        />
      </div>

      {tour.pricing.singleSupplement && (
        <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[14px] font-semibold text-[var(--text-primary)]">Single rooms</p>
              <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">
                {formatPrice(tour.pricing.singleSupplement)} per single room supplement
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Decrease single rooms"
                onClick={() => onSingleRooms(Math.max(0, singleRooms - 1))}
                disabled={singleRooms <= 0}
                className="w-9 h-9 border border-[var(--border-default)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer disabled:opacity-30"
              >
                −
              </button>
              <span className="w-7 text-center text-[15px] font-semibold tabular-nums">{singleRooms}</span>
              <button
                type="button"
                aria-label="Increase single rooms"
                onClick={() => onSingleRooms(Math.min(totalTravelers, singleRooms + 1))}
                disabled={singleRooms >= totalTravelers}
                className="w-9 h-9 border border-[var(--border-default)] rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors cursor-pointer disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
        </div>
      )}

      {groupDiscountPct > 0 && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--primary-light)] border border-[var(--primary)]/30 flex items-start gap-3">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0 mt-0.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <div>
            <p className="text-[13px] font-bold text-[var(--primary-deep)]">
              Group discount unlocked — {Math.round(groupDiscountPct * 100)}% off
            </p>
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
              Applied automatically. Add 4+ travellers for 10% off, 8+ for 15% off.
            </p>
          </div>
        </div>
      )}

      {groupDiscountPct === 0 && adults < 4 && (
        <div className="p-4 rounded-[var(--radius-md)] bg-[var(--accent-warm-light)] border border-[var(--accent-warm)]/30">
          <p className="text-[13px] font-semibold text-[var(--accent-warm)]">
            Tip · Add {4 - totalTravelers} more traveller{4 - totalTravelers !== 1 ? "s" : ""} to unlock 10% group discount
          </p>
        </div>
      )}
    </section>
  );
}

function StepDetails({
  contact,
  onContactChange,
  travelers,
  onTravelerChange,
}: {
  contact: { firstName: string; lastName: string; email: string; phone: string };
  onContactChange: (p: Partial<{ firstName: string; lastName: string; email: string; phone: string }>) => void;
  travelers: TravelerProfile[];
  onTravelerChange: (index: number, p: Partial<TravelerProfile>) => void;
}) {
  return (
    <section className="space-y-6">
      <SectionHeader title="Your details" sub="We use these to send your booking confirmation and trip updates." />

      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
        <p className="text-[13px] font-bold uppercase tracking-wider text-[var(--primary)] mb-3">Lead contact</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LabeledInput
            label="First name"
            required
            value={contact.firstName}
            onChange={(v) => onContactChange({ firstName: v })}
            placeholder="Ali"
          />
          <LabeledInput
            label="Last name"
            value={contact.lastName}
            onChange={(v) => onContactChange({ lastName: v })}
            placeholder="Khan"
          />
          <LabeledInput
            label="Email"
            type="email"
            value={contact.email}
            onChange={(v) => onContactChange({ email: v })}
            placeholder="ali@example.com"
            error={contact.email && !validEmail(contact.email) ? "Enter a valid email" : undefined}
          />
          <LabeledInput
            label="Phone"
            required
            type="tel"
            value={contact.phone}
            onChange={(v) => onContactChange({ phone: v })}
            placeholder="+92 300 0000000"
            error={contact.phone && !validPhone(contact.phone) ? "Enter a valid phone" : undefined}
          />
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[13px] font-bold uppercase tracking-wider text-[var(--primary)]">
          Traveller details · {travelers.length}
        </p>
        {travelers.map((t, i) => (
          <TravelerCard key={i} traveler={t} index={i} onChange={onTravelerChange} />
        ))}
      </div>
    </section>
  );
}

function StepReview({
  tour,
  pricing,
  adults,
  childCount,
  departureCity,
  departureDate,
  paymentPlan,
  onPaymentPlanChange,
  specialRequests,
  onSpecialRequests,
  travelers,
}: {
  tour: Tour;
  pricing: ReturnType<typeof calculatePricing>;
  adults: number;
  childCount: number;
  departureCity: DepartureCity;
  departureDate: string | null;
  paymentPlan: PaymentPlan;
  onPaymentPlanChange: (plan: PaymentPlan) => void;
  specialRequests: string;
  onSpecialRequests: (v: string) => void;
  travelers: TravelerProfile[];
}) {
  return (
    <section className="space-y-6">
      <SectionHeader title="Review & confirm" sub="You won't be charged yet — we'll hold your seat and send a secure payment link." />

      <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5 space-y-3">
        <p className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)]">Trip</p>
        <p className="text-[16px] font-bold text-[var(--text-primary)]">{tour.name}</p>
        <div className="grid grid-cols-2 gap-y-2 text-[13px]">
          <span className="text-[var(--text-tertiary)]">Departure</span>
          <span className="text-right text-[var(--text-primary)] font-medium capitalize">{departureCity}</span>
          <span className="text-[var(--text-tertiary)]">Date</span>
          <span className="text-right text-[var(--text-primary)] font-medium">
            {departureDate ? fmtLongDate(departureDate) : "Flexible"}
          </span>
          <span className="text-[var(--text-tertiary)]">Duration</span>
          <span className="text-right text-[var(--text-primary)] font-medium">{tour.duration} days</span>
          <span className="text-[var(--text-tertiary)]">Travellers</span>
          <span className="text-right text-[var(--text-primary)] font-medium">
            {adults} adult{adults !== 1 ? "s" : ""}{childCount > 0 ? `, ${childCount} child${childCount !== 1 ? "ren" : ""}` : ""}
          </span>
        </div>
      </div>

      <PriceBreakdown
        breakdown={pricing}
        adults={adults}
        childCount={childCount}
        paymentPlan={paymentPlan}
        onPaymentPlanChange={onPaymentPlanChange}
        defaultOpen
      />

      <div>
        <label className="text-[12px] font-bold uppercase tracking-wide text-[var(--text-secondary)] block mb-2">
          Special requests · optional
        </label>
        <textarea
          rows={3}
          maxLength={500}
          value={specialRequests}
          onChange={(e) => onSpecialRequests(e.target.value)}
          placeholder="Dietary needs, room preferences, anything we should know…"
          className="w-full px-4 py-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors resize-none"
        />
        <p className="text-[10px] text-[var(--text-tertiary)] text-right mt-1 tabular-nums">
          {specialRequests.length}/500
        </p>
      </div>

      <div className="p-4 bg-[var(--primary-light)] border border-[var(--primary)]/20 rounded-[var(--radius-md)]">
        <div className="flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" className="mt-0.5 shrink-0">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <div>
            <p className="text-[13px] font-bold text-[var(--primary-deep)] mb-1">Free cancellation</p>
            <p className="text-[12px] text-[var(--text-secondary)]">
              Cancel up to 7 days before departure for a full refund. After that, 50% refund up to 48 hours before.
            </p>
          </div>
        </div>
      </div>

      {travelers.length > 1 && (
        <details className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] p-5">
          <summary className="cursor-pointer text-[13px] font-semibold text-[var(--text-primary)]">
            {travelers.length} travellers on this booking
          </summary>
          <ul className="mt-3 space-y-2 text-[13px] text-[var(--text-secondary)]">
            {travelers.map((t, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-[var(--bg-subtle)] text-[11px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span>
                  {t.fullName || "(name missing)"} · {t.ageGroup}
                  {t.dateOfBirth ? ` · ${new Date(t.dateOfBirth).toLocaleDateString()}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function SummaryCard({
  tour,
  departureCity,
  departureDate,
  adults,
  childCount,
  pricing,
  paymentPlan,
  onPaymentPlanChange,
}: {
  tour: Tour;
  departureCity: DepartureCity;
  departureDate: string | null;
  adults: number;
  childCount: number;
  pricing: ReturnType<typeof calculatePricing>;
  paymentPlan: PaymentPlan;
  onPaymentPlanChange: (plan: PaymentPlan) => void;
}) {
  return (
    <div
      className="sticky top-[100px] bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] overflow-hidden"
      style={{ boxShadow: "var(--shadow-md)" }}
    >
      <div className="relative aspect-[16/9]">
        {tour.images[0]?.url && <Image src={tour.images[0].url} alt={tour.name} fill className="object-cover" sizes="380px" />}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
            {tour.category.replace(/-/g, " ")}
          </p>
          <h3 className="text-[16px] font-bold text-white leading-snug mt-0.5">{tour.name}</h3>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <SummaryRow label="Departure" value={departureCity.charAt(0).toUpperCase() + departureCity.slice(1)} />
          <SummaryRow label="Date" value={departureDate ? fmtLongDate(departureDate) : "Flexible"} />
          <SummaryRow label="Duration" value={`${tour.duration} days`} />
          <SummaryRow
            label="Travellers"
            value={`${adults + childCount} (${adults} adult${adults !== 1 ? "s" : ""}${childCount > 0 ? `, ${childCount} child${childCount !== 1 ? "ren" : ""}` : ""})`}
          />
        </div>

        <div className="border-t border-[var(--border-default)]" />

        <PriceBreakdown
          breakdown={pricing}
          adults={adults}
          childCount={childCount}
          paymentPlan={paymentPlan}
          onPaymentPlanChange={onPaymentPlanChange}
          allowInstallments
        />
      </div>
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

function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div>
      <h2 className="text-[22px] font-bold text-[var(--text-primary)] tracking-tight">{title}</h2>
      {sub && <p className="mt-1 text-[13px] text-[var(--text-secondary)] leading-relaxed">{sub}</p>}
    </div>
  );
}

function LabeledInput({
  label,
  required,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
        {label}
        {required && <span className="text-[var(--error)] ml-0.5" aria-hidden>*</span>}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full h-11 px-4 border rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 transition-colors ${
          error ? "border-[var(--error)] focus:border-[var(--error)]" : "border-[var(--border-default)] focus:border-[var(--primary)]"
        }`}
      />
      {error && <p className="mt-1 text-[11px] text-[var(--error)] font-medium">{error}</p>}
    </div>
  );
}

function WhatsAppSentCard({ tour, onClose }: { tour: Tour; onClose?: () => void }) {
  return (
    <div className="p-8 rounded-[var(--radius-md)] bg-[var(--primary-light)] border border-[var(--primary)]/30 text-center">
      <div className="w-14 h-14 mx-auto rounded-full bg-[var(--whatsapp)] flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
        </svg>
      </div>
      <p className="text-[18px] font-bold text-[var(--primary-deep)]">Request sent on WhatsApp</p>
      <p className="text-[13px] text-[var(--text-secondary)] mt-2 max-w-[320px] mx-auto">
        Our {tour.name.replace(/tour|trip|adventure/gi, "").trim()} specialist will confirm availability and send you a secure payment link. Typical reply in under 1 hour.
      </p>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="mt-5 h-10 px-5 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
        >
          Close
        </button>
      )}
    </div>
  );
}
