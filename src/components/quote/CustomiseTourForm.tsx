"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import { MobileSearchFields } from "@/components/search/MobileSearchFields";
import { cn, getWhatsAppUrl } from "@/lib/utils";
import { useAuth } from "@/components/auth/AuthProvider";
import { createQuoteRequest } from "@/services/quote.service";
import {
  DestinationField,
  FieldButton,
  DropdownPanel,
  StepperButton,
  Divider,
  StaysCalendarPanel,
  type DestinationOption,
} from "@/components/home/SearchWidget";

type ActiveField = "dest" | "dates" | "who" | null;

const BUDGETS = ["Budget", "Deluxe", "Premium", "Luxury"] as const;
const INTERESTS = [
  "Trekking & Hiking",
  "Family Friendly",
  "Honeymoon",
  "Photography",
  "Culture & History",
  "Adventure Sports",
  "Road Trip",
  "Wildlife & Nature",
  "Relaxation",
] as const;

const PINNED = ["hunza", "skardu", "chitral", "naran", "kumrat", "lahore"];

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function fmtDateRange(start: Date | null, end: Date | null): string | undefined {
  if (!start) return undefined;
  const s = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (!end) return s;
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${s} – ${end.getDate()}`;
  }
  return `${s} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

export function CustomiseTourForm({ destinations = [] }: { destinations?: DestinationOption[] }) {
  const { user } = useAuth();

  // ── Search-bar elements (destination · dates · guests) ──
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const [selectedDest, setSelectedDest] = useState<string | null>(null);
  const [destSearch, setDestSearch] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [travelers, setTravelers] = useState({ adults: 2, children: 0, infants: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  // ── Custom-tour extras ──
  const [budget, setBudget] = useState<(typeof BUDGETS)[number] | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill contact from the signed-in user, like QuoteRequestDialog.
  useEffect(() => {
    const name = ((user?.user_metadata?.full_name as string | undefined) ?? "").trim();
    setForm((f) => ({ ...f, name: name || f.name, email: user?.email ?? f.email }));
  }, [user]);

  // Close any open dropdown when clicking outside the pill.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target as Node)) setActiveField(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selectedDestName = destinations.find((d) => d.slug === selectedDest)?.name;
  const totalGuests = travelers.adults + travelers.children + travelers.infants;
  const dateRangeLabel = fmtDateRange(startDate, endDate);

  const isDestSearchPrefilled =
    !!selectedDest && destSearch === (selectedDestName ?? "");
  const parentDests = useMemo(
    () =>
      destinations
        .filter((d) => !d.parentSlug)
        .sort((a, b) => {
          const ai = PINNED.indexOf(a.slug);
          const bi = PINNED.indexOf(b.slug);
          if (ai !== -1 && bi !== -1) return ai - bi;
          if (ai !== -1) return -1;
          if (bi !== -1) return 1;
          return a.name.localeCompare(b.name);
        }),
    [destinations]
  );
  const filteredDests = useMemo(() => {
    if (!destSearch || isDestSearchPrefilled) return parentDests;
    const q = destSearch.toLowerCase();
    return destinations
      .filter((d) => d.name.toLowerCase().includes(q) || d.region.toLowerCase().includes(q))
      .sort((a, b) => {
        const aStarts = a.name.toLowerCase().startsWith(q);
        const bStarts = b.name.toLowerCase().startsWith(q);
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        const aParent = !a.parentSlug;
        const bParent = !b.parentSlug;
        if (aParent !== bParent) return aParent ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [destinations, destSearch, isDestSearchPrefilled, parentDests]);

  // Range selection for the hotel-style two-month calendar.
  function handleCalendarSelect(date: Date) {
    if (date.getTime() === 0) { setStartDate(null); setEndDate(null); return; }
    if (!startDate || (startDate && endDate)) {
      setStartDate(date); setEndDate(null);
    } else if (date < startDate) {
      setStartDate(date); setEndDate(null);
    } else {
      setEndDate(date); setActiveField("who");
    }
  }

  function toggleInterest(value: string) {
    setInterests((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const isValid =
    form.name.trim().length > 1 &&
    /@/.test(form.email) &&
    form.phone.trim().length >= 6 &&
    travelers.adults >= 1;

  function travelerSummary() {
    const parts = [`${travelers.adults} adult${travelers.adults !== 1 ? "s" : ""}`];
    if (travelers.children) parts.push(`${travelers.children} child${travelers.children !== 1 ? "ren" : ""}`);
    if (travelers.infants) parts.push(`${travelers.infants} infant${travelers.infants !== 1 ? "s" : ""}`);
    return parts.join(", ");
  }

  function composedNotes() {
    const lines = [
      budget ? `Budget: ${budget}` : null,
      interests.length ? `Interests: ${interests.join(", ")}` : null,
      `Travellers: ${travelerSummary()}`,
    ].filter(Boolean);
    return [lines.join("\n"), form.notes.trim()].filter(Boolean).join("\n\n");
  }

  const whatsappMessage =
    `Hi Traverse Pakistan! I'd like to plan a custom tour.\n` +
    `Destination: ${selectedDestName ?? "Open to suggestions"}\n` +
    `Dates: ${dateRangeLabel ?? "Flexible"}\n` +
    `Travellers: ${travelerSummary()}` +
    (budget ? `\nBudget: ${budget}` : "") +
    (interests.length ? `\nInterests: ${interests.join(", ")}` : "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await createQuoteRequest({
        requestType: "custom",
        displayName: selectedDestName ? `Custom tour — ${selectedDestName}` : "Custom tour — Pakistan",
        slug: selectedDest ?? undefined,
        tier: budget ?? undefined,
        preferredStartDate: startDate ? toISODate(startDate) : undefined,
        preferredEndDate: endDate ? toISODate(endDate) : undefined,
        adults: travelers.adults,
        children: travelers.children,
        rooms: 1,
        contact: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
        notes: composedNotes() || undefined,
      });

      // Best-effort team notification — never blocks the success state.
      void fetch("/api/quote/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "custom",
          displayName: selectedDestName ? `Custom tour — ${selectedDestName}` : "Custom tour — Pakistan",
          tier: budget,
          preferredStartDate: startDate ? toISODate(startDate) : null,
          preferredEndDate: endDate ? toISODate(endDate) : null,
          adults: travelers.adults,
          children: travelers.children,
          rooms: 1,
          destinationName: selectedDestName ?? null,
          interests,
          contact: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
          notes: composedNotes() || null,
        }),
      }).catch(() => { /* notification is best-effort */ });

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  }

  const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5";
  const inputCls =
    "w-full h-11 px-3.5 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] transition-colors";

  if (submitted) {
    return (
      <div className="max-w-[560px] mx-auto text-center space-y-4 py-10">
        <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style={{ background: "var(--primary-light)" }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className="text-[22px] font-bold text-[var(--text-primary)]">Request received</h3>
        <p className="text-[15px] text-[var(--text-secondary)]">
          Thanks{form.name ? `, ${form.name.split(" ")[0]}` : ""}. Our travel team will craft a tailored itinerary and reply within 2 hours via email or WhatsApp.
        </p>
        <a
          href={getWhatsAppUrl(whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 px-6 items-center justify-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          Message us on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Search: desktop pill (md+) ── */}
      <div className="hidden md:block">
      <LayoutGroup id="customise-tour">
        <div ref={widgetRef} className="relative">
          <div
            className="bg-[var(--bg-subtle)] [[data-theme=dark]_&]:bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-[var(--radius-full)] h-[72px] grid grid-cols-[1fr_1px_1fr_1px_1fr]"
            style={{ boxShadow: "var(--shadow-lg)" }}
          >
            <DestinationField
              value={selectedDestName}
              active={activeField === "dest"}
              destSearch={destSearch}
              onDestSearchChange={setDestSearch}
              className="flex-1"
              onActivate={() => setActiveField(activeField === "dest" ? null : "dest")}
              onClear={() => { setSelectedDest(null); setDestSearch(""); setActiveField("dest"); }}
            />
            <Divider faded={activeField === "dest" || activeField === "dates"} />
            <FieldButton
              label="When"
              value={dateRangeLabel}
              placeholder="Add dates"
              active={activeField === "dates"}
              className="flex-1"
              onClick={() => setActiveField(activeField === "dates" ? null : "dates")}
              onClear={() => { setStartDate(null); setEndDate(null); }}
            />
            <Divider faded={activeField === "dates" || activeField === "who"} />
            <FieldButton
              label="Who"
              value={totalGuests > 0 ? `${totalGuests} guest${totalGuests > 1 ? "s" : ""}` : undefined}
              placeholder="Add guests"
              active={activeField === "who"}
              className="flex-1"
              onClick={() => setActiveField(activeField === "who" ? null : "who")}
              onClear={() => setTravelers({ adults: 0, children: 0, infants: 0 })}
            />
          </div>

          <AnimatePresence>
            {activeField === "dest" && (
              <DropdownPanel key="dest" className="left-0 w-full sm:w-[460px]">
                <div className="max-h-[400px] overflow-y-auto py-2">
                  {filteredDests.length === 0 && (
                    <p className="px-5 py-6 text-center text-[14px] text-[var(--text-tertiary)]">No destinations found</p>
                  )}
                  {filteredDests.map((dest) => (
                    <button
                      key={dest.slug}
                      type="button"
                      onClick={() => { setSelectedDest(dest.slug); setDestSearch(""); setActiveField("dates"); }}
                      className={cn(
                        "w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer",
                        selectedDest === dest.slug && "bg-[var(--primary-light)]"
                      )}
                    >
                      <span className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] flex items-center justify-center shrink-0">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.8">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                        </svg>
                      </span>
                      <div className="flex-1">
                        <p className="text-[15px] font-semibold text-[var(--text-primary)]">{dest.name}</p>
                        <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{dest.region}</p>
                      </div>
                      {selectedDest === dest.slug && (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </DropdownPanel>
            )}

            {activeField === "dates" && (
              <DropdownPanel key="dates" className="left-1/2 w-[340px] sm:w-[850px]" centerX>
                <StaysCalendarPanel
                  startDate={startDate}
                  endDate={endDate}
                  onSelect={handleCalendarSelect}
                  onFlexSelect={(start, end) => { setStartDate(start); setEndDate(end); setActiveField("who"); }}
                />
              </DropdownPanel>
            )}

            {activeField === "who" && (
              <DropdownPanel key="who" className="right-0 w-[370px]">
                <div className="px-6 pt-6 pb-4 divide-y divide-[var(--border-default)]">
                  <div className="flex items-center justify-between pb-5">
                    <div>
                      <p className="text-[16px] font-semibold text-[var(--text-primary)]">Adults</p>
                      <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">Ages 13+</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StepperButton onClick={() => setTravelers((p) => ({ ...p, adults: Math.max(1, p.adults - 1) }))} disabled={travelers.adults <= 1}>−</StepperButton>
                      <span className="w-8 text-center text-[16px] font-semibold tabular-nums">{travelers.adults}</span>
                      <StepperButton onClick={() => setTravelers((p) => ({ ...p, adults: Math.min(20, p.adults + 1) }))}>+</StepperButton>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-5">
                    <div>
                      <p className="text-[16px] font-semibold text-[var(--text-primary)]">Children</p>
                      <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">Ages 2–12</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StepperButton onClick={() => setTravelers((p) => ({ ...p, children: Math.max(0, p.children - 1) }))} disabled={travelers.children <= 0}>−</StepperButton>
                      <span className="w-8 text-center text-[16px] font-semibold tabular-nums">{travelers.children}</span>
                      <StepperButton onClick={() => setTravelers((p) => ({ ...p, children: p.children + 1 }))}>+</StepperButton>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-5">
                    <div>
                      <p className="text-[16px] font-semibold text-[var(--text-primary)]">Infants</p>
                      <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">Under 2</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StepperButton onClick={() => setTravelers((p) => ({ ...p, infants: Math.max(0, p.infants - 1) }))} disabled={travelers.infants <= 0}>−</StepperButton>
                      <span className="w-8 text-center text-[16px] font-semibold tabular-nums">{travelers.infants}</span>
                      <StepperButton onClick={() => setTravelers((p) => ({ ...p, infants: p.infants + 1 }))}>+</StepperButton>
                    </div>
                  </div>
                  <div className="pt-4 flex items-center justify-between">
                    <span className="text-[14px] text-[var(--text-tertiary)]">{totalGuests} traveller{totalGuests !== 1 ? "s" : ""} total</span>
                    <button type="button" onClick={() => setActiveField(null)} className="text-[14px] font-semibold text-[var(--primary)] hover:underline cursor-pointer">Done</button>
                  </div>
                </div>
              </DropdownPanel>
            )}
          </AnimatePresence>
        </div>
      </LayoutGroup>
      </div>

      {/* ── Search: mobile vertical stack — reuses the exact site mobile search ── */}
      <div className="md:hidden">
        <MobileSearchFields
          destinations={destinations}
          rangeDates
          selectedDest={selectedDest}
          onSelectedDestChange={setSelectedDest}
          startDate={startDate}
          endDate={endDate}
          onStartDateChange={setStartDate}
          onEndDateChange={setEndDate}
          travelers={travelers}
          onTravelersChange={setTravelers}
        />
      </div>

      {/* ── Budget ── */}
      <div>
        <label className={labelCls}>Tier</label>
        <div className="flex flex-wrap gap-2">
          {BUDGETS.map((b) => {
            const active = budget === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => setBudget(active ? null : b)}
                className={cn(
                  "h-10 px-4 rounded-[var(--radius-full)] text-[13px] font-semibold border transition-colors cursor-pointer",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                )}
              >
                {b}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Trip style / interests ── */}
      <div>
        <label className={labelCls}>What are you into? <span className="font-normal normal-case text-[var(--text-tertiary)]">(optional, pick any)</span></label>
        <div className="flex flex-wrap gap-2">
          {INTERESTS.map((it) => {
            const active = interests.includes(it);
            return (
              <button
                key={it}
                type="button"
                onClick={() => toggleInterest(it)}
                className={cn(
                  "h-10 px-4 rounded-[var(--radius-full)] text-[13px] font-semibold border transition-colors cursor-pointer",
                  active
                    ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]"
                    : "border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)]"
                )}
              >
                {it}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Contact ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={labelCls}>Full name <span className="text-[var(--error)]">*</span></label>
          <input required className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
        </div>
        <div>
          <label className={labelCls}>Email <span className="text-[var(--error)]">*</span></label>
          <input required type="email" inputMode="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
        </div>
        <div>
          <label className={labelCls}>Phone / WhatsApp <span className="text-[var(--error)]">*</span></label>
          <input required type="tel" inputMode="tel" className={inputCls} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 0000000" />
        </div>
      </div>

      {/* ── Notes ── */}
      <div>
        <label className={labelCls}>Tell us about your dream trip</label>
        <textarea
          className={inputCls + " h-auto py-2.5 resize-none"}
          rows={4}
          maxLength={2000}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          placeholder="Must-see places, pace, occasion, accommodation preferences, dietary needs…"
        />
      </div>

      {error && (
        <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-[var(--radius-sm)] text-[13px] text-[var(--error)]">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="submit"
          disabled={!isValid || submitting}
          className="flex-1 h-12 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? "Sending…" : "Send my request"}
        </button>
        <a
          href={getWhatsAppUrl(whatsappMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="h-12 px-5 flex items-center justify-center gap-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          WhatsApp
        </a>
      </div>

      <p className="text-[12px] text-[var(--text-tertiary)] text-center">
        No charge yet — this is a quote request. We&apos;ll confirm availability and pricing before booking.
      </p>
    </form>
  );
}
