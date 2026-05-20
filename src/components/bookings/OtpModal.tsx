"use client";

import { useState, useEffect, useCallback } from "react";

interface Props {
  bookingRef: string;
  action: string;
  onVerified: () => void;
  onClose: () => void;
}

const RESEND_COOLDOWN = 30;

export function OtpModal({ bookingRef, action, onVerified, onClose }: Props) {
  const [step, setStep] = useState<"send" | "verify">("send");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send verification code. Please try again.");
        return;
      }
      setStep("verify");
      setCooldown(RESEND_COOLDOWN);
    } catch {
      setError("Could not send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [bookingRef, action]);

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef, code }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Invalid code. Please try again.");
        return;
      }
      onVerified();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm bg-[var(--bg-primary)] rounded-[var(--radius-lg)] p-6 space-y-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-[var(--text-primary)]">Verify to continue</h2>
          <button type="button" onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {step === "send" ? (
          <div className="space-y-4">
            <p className="text-[14px] text-[var(--text-secondary)]">
              We&apos;ll send a 6-digit verification code to your booking email address.
            </p>
            {error && <p className="text-[13px] text-[var(--error)]">{error}</p>}
            <button
              type="button"
              onClick={sendOtp}
              disabled={loading}
              className="w-full h-11 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Sending…" : "Send verification code"}
            </button>
          </div>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-4">
            <p className="text-[14px] text-[var(--text-secondary)]">
              Enter the 6-digit code sent to your email.
            </p>
            <input
              type="text"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              required
              autoFocus
              className="w-full h-12 px-4 text-center text-[20px] font-mono tracking-[0.3em] rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
            />
            {error && <p className="text-[13px] text-[var(--error)]">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full h-11 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Verifying…" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={sendOtp}
              disabled={loading || cooldown > 0}
              className="w-full text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
