"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

export default function FindBookingPage() {
  const router = useRouter();
  const [ref, setRef] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const bookingRef = ref.trim().toUpperCase();
    if (!bookingRef || !contact.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/bookings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef, contact: contact.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Booking not found. Please check your details.");
        return;
      }
      sessionStorage.setItem(`booking-verified-${bookingRef}`, "1");
      router.push(`/bookings/${bookingRef}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-[var(--primary-light)] flex items-center justify-center mb-4">
            <Icon name="bookmark" size="lg" color="var(--primary)" />
          </div>
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight">Find My Booking</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-2">
            Enter your booking reference and the email or phone number you used when booking.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Booking Reference
            </label>
            <input
              type="text"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
              placeholder="e.g. PKG-CD52A418"
              required
              className="w-full h-11 px-4 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] font-mono focus:outline-none focus:border-[var(--primary)] transition-colors placeholder:font-sans placeholder:text-[var(--text-tertiary)]"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
              Email or Phone Number
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email address or phone number"
              required
              className="w-full h-11 px-4 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
          </div>
          {error && <p className="text-[13px] text-[var(--error)]">{error}</p>}
          <button
            type="submit"
            disabled={loading || !ref.trim() || !contact.trim()}
            className="w-full h-11 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Looking up…" : "Find booking"}
          </button>
        </form>

        <p className="text-center text-[13px] text-[var(--text-tertiary)]">
          Need help?{" "}
          <a
            href="https://wa.me/923216650670"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--primary)] hover:underline"
          >
            Contact us on WhatsApp
          </a>
        </p>
      </div>
    </div>
  );
}
