"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { createQuoteRequest } from "@/services/quote.service";
import { getWhatsAppUrl } from "@/lib/utils";
import type { QuoteRequestType } from "@/types/quote";
import { InlineAlert } from "@/components/ui/InlineAlert";

interface Props {
  open: boolean;
  onClose: () => void;
  requestType: QuoteRequestType;
  slug?: string;
  displayName: string;
  tier?: string;
  defaultAdults?: number;
  defaultChildren?: number;
  defaultRooms?: number;
  defaultStartDate?: string;
  defaultEndDate?: string;
  defaultDepartureCity?: string;
  whatsappFallbackMessage?: string;
}

export function QuoteRequestDialog({
  open,
  onClose,
  requestType,
  slug,
  displayName,
  tier,
  defaultAdults = 2,
  defaultChildren = 0,
  defaultRooms = 1,
  defaultStartDate,
  defaultEndDate,
  defaultDepartureCity,
  whatsappFallbackMessage,
}: Props) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    adults: defaultAdults,
    children: defaultChildren,
    rooms: defaultRooms,
    startDate: defaultStartDate ?? "",
    endDate: defaultEndDate ?? "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const name = ((user?.user_metadata?.full_name as string | undefined) ?? "").trim();
    setForm((f) => ({
      ...f,
      name: name || f.name,
      email: user?.email ?? f.email,
    }));
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  const isValid =
    form.name.trim().length > 1 &&
    /@/.test(form.email) &&
    form.phone.trim().length >= 6 &&
    form.adults >= 1;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    setSubmitting(true);
    setError(null);
    try {
      await createQuoteRequest({
        requestType,
        slug,
        displayName,
        tier,
        preferredStartDate: form.startDate || undefined,
        preferredEndDate: form.endDate || undefined,
        adults: form.adults,
        children: form.children,
        rooms: form.rooms,
        departureCity: defaultDepartureCity,
        contact: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
        notes: form.notes.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit request");
    } finally {
      setSubmitting(false);
    }
  }

  const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-1.5";
  const inputCls = "w-full h-11 px-3.5 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)] transition-colors";

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="quote-dialog-title"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-default"
      />

      <div
        className="relative w-full sm:max-w-[560px] max-h-[92vh] overflow-y-auto bg-[var(--bg-primary)] rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-md)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-[var(--bg-primary)] px-5 py-4 border-b border-[var(--border-default)] flex items-start justify-between gap-4">
          <div>
            <h2 id="quote-dialog-title" className="text-[18px] font-bold text-[var(--text-primary)]">
              Request a quote
            </h2>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5 line-clamp-1">
              {displayName}{tier ? ` · ${tier}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full flex items-center justify-center" style={{ background: "var(--primary-light)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="text-[18px] font-bold text-[var(--text-primary)]">Request received</h3>
            <p className="text-[14px] text-[var(--text-secondary)]">
              Our team will review your request and reply within 2 hours via email or WhatsApp.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 px-6 items-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className={labelCls}>Full name</label>
                <input required className={inputCls} value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name" />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input required type="email" className={inputCls} value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" />
              </div>
              <div>
                <label className={labelCls}>Phone / WhatsApp</label>
                <input required type="tel" className={inputCls} value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+92 300 0000000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Start date</label>
                <input type="date" className={inputCls} value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>End date</label>
                <input type="date" className={inputCls} value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Adults</label>
                <input required type="number" min={1} max={40} className={inputCls} value={form.adults}
                  onChange={(e) => setForm({ ...form, adults: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <div>
                <label className={labelCls}>Children</label>
                <input type="number" min={0} max={20} className={inputCls} value={form.children}
                  onChange={(e) => setForm({ ...form, children: Math.max(0, Number(e.target.value) || 0) })} />
              </div>
              <div>
                <label className={labelCls}>{requestType === "hotel" ? "Rooms" : "Rooms"}</label>
                <input type="number" min={1} max={20} className={inputCls} value={form.rooms}
                  onChange={(e) => setForm({ ...form, rooms: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Anything special?</label>
              <textarea
                className={inputCls + " h-auto py-2.5 resize-none"}
                rows={3}
                maxLength={2000}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Dietary needs, accessibility, preferred hotels, etc."
              />
            </div>

            {error && <InlineAlert>{error}</InlineAlert>}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={!isValid || submitting}
                className="flex-1 h-12 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting ? "Sending…" : "Send request"}
              </button>
              <a
                href={getWhatsAppUrl(whatsappFallbackMessage)}
                target="_blank"
                rel="noopener noreferrer"
                className="h-12 px-5 flex items-center justify-center gap-2 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                WhatsApp
              </a>
            </div>

            <p className="text-[11px] text-[var(--text-tertiary)] text-center">
              No charge yet — this is a quote request. We&apos;ll confirm availability and pricing before booking.
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
