"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";

interface Props {
  bookingRef: string;
  onVerified: () => void;
}

export function BookingVerifyGate({ bookingRef, onVerified }: Props) {
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef, contact }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Details do not match. Please check and try again.");
        return;
      }
      // Store verified state in sessionStorage so user doesn't re-verify on refresh
      sessionStorage.setItem(`booking-verified-${bookingRef}`, "1");
      onVerified();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-[var(--primary-light)] flex items-center justify-center mb-4">
            <Icon name="lock" size="lg" color="var(--primary)" />
          </div>
          <h1 className="text-[22px] font-bold text-[var(--text-primary)]">Verify your identity</h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-2">
            Enter the email address or phone number used when booking
            <span className="block font-mono font-semibold text-[var(--text-primary)] mt-1">{bookingRef}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Email or phone number"
            required
            className="w-full h-11 px-4 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
          {error && (
            <p className="text-[13px] text-[var(--error)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !contact.trim()}
            className="w-full h-11 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Verifying…" : "View booking"}
          </button>
        </form>
      </div>
    </div>
  );
}
