"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { InlineAlert } from "@/components/ui/InlineAlert";

function FindBookingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryError = searchParams?.get("error") ?? null;
  const prefilledRef = searchParams?.get("ref")?.toUpperCase() ?? "";

  const [bookingRef, setBookingRef] = useState(prefilledRef);
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(queryError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!bookingRef.trim() || !contact.trim()) return;

    setLoading(true);
    try {
      const ref = bookingRef.trim().toUpperCase();
      const res = await fetch("/api/bookings/view-grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef: ref, contact: contact.trim() }),
      });
      const data = await res.json();
      if (data.granted) {
        router.replace(`/bookings/${ref}`);
        return;
      }
      setError("We couldn't find a booking matching that reference and contact. Double-check both and try again.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-7">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-[var(--primary-light)] flex items-center justify-center mb-4">
            <Icon name="bookmark" size="lg" color="var(--primary)" />
          </div>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight">View My Booking</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-2">
            Enter your booking reference and the email or phone you used when booking.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Booking Reference
            </label>
            <input
              type="text"
              value={bookingRef}
              onChange={(e) => setBookingRef(e.target.value.toUpperCase())}
              placeholder="e.g. PKG-7A925DE6"
              required
              autoFocus
              className="w-full h-11 px-4 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] font-mono focus:outline-none focus:border-[var(--primary)] transition-colors placeholder:font-sans placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Email or WhatsApp number
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="you@example.com or +923216650670"
              required
              className="w-full h-11 px-4 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>
          {error && <InlineAlert>{error}</InlineAlert>}
          <button
            type="submit"
            disabled={loading || !bookingRef.trim() || !contact.trim()}
            className="w-full h-11 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Looking up…" : "Find booking"}
          </button>
        </form>

        <div className="space-y-1.5">
          <Link
            href="/auth/sign-in"
            className="w-full h-11 flex items-center justify-center border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            Get a Magic Link
          </Link>
          <p className="text-center text-[12px] text-[var(--text-tertiary)]">
            On your Email to view all bookings
          </p>
        </div>

        <p className="text-center text-[13px] text-[var(--text-tertiary)]">
          <a href="https://wa.me/923216650670" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">
            Need help? Contact us on WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}

export function FindBookingForm() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><p className="text-[var(--text-secondary)] text-[15px]">Loading…</p></div>}>
      <FindBookingInner />
    </Suspense>
  );
}
