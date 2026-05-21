"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type Channel = "email" | "whatsapp";
type Step = "identifier" | "channel" | "code";

const RESEND_COOLDOWN = 30;

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function FindBookingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get("next") ?? "/account/trips";
  const queryError = searchParams?.get("error") ?? null;

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(queryError);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const isEmailIdentifier = looksLikeEmail(identifier.trim());

  function goToChannelStep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = identifier.trim();
    if (!value) {
      setError("Please enter an email or WhatsApp number.");
      return;
    }
    // If identifier is a phone, default to WhatsApp; if email, default to email.
    setChannel(isEmailIdentifier ? "email" : "whatsapp");
    setStep("channel");
  }

  const sendCode = useCallback(async (chosenChannel: Channel) => {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), channel: chosenChannel }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send verification code. Please try again.");
        return;
      }
      setChannel(chosenChannel);
      setStep("code");
      setCooldown(RESEND_COOLDOWN);
      setInfo(
        chosenChannel === "email"
          ? "If an account exists, a 6-digit code has been emailed to you."
          : "If an account exists, a 6-digit code has been sent on WhatsApp."
      );
    } catch {
      setError("Could not send verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/otp", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok || !data.tokenHash) {
        setError(data.error ?? "Invalid code. Please try again.");
        return;
      }

      const supabase = getSupabaseBrowser();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: data.type ?? "magiclink",
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      router.replace(next);
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
          <h1 className="text-[26px] font-bold text-[var(--text-primary)] tracking-tight">
            {step === "code" ? "Enter your code" : "View My Booking"}
          </h1>
          <p className="text-[14px] text-[var(--text-secondary)] mt-2">
            {step === "identifier" && "Enter the email or WhatsApp number you used when booking."}
            {step === "channel" && "How would you like to verify?"}
            {step === "code" && "Check your inbox or WhatsApp and enter the 6-digit code below."}
          </p>
        </div>

        {step === "identifier" && (
          <form onSubmit={goToChannelStep} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                Email or WhatsApp number
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@example.com or +923216650670"
                required
                autoFocus
                className="w-full h-11 px-4 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>
            {error && <p className="text-[13px] text-[var(--error)]">{error}</p>}
            <button
              type="submit"
              disabled={loading || !identifier.trim()}
              className="w-full h-11 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              Continue
            </button>
          </form>
        )}

        {step === "channel" && (
          <div className="space-y-3">
            {isEmailIdentifier && (
              <button
                type="button"
                onClick={() => sendCode("email")}
                disabled={loading}
                className="w-full h-12 flex items-center justify-center gap-2 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Icon name="envelope" size="sm" />
                Email me a code
              </button>
            )}
            <button
              type="button"
              onClick={() => sendCode("whatsapp")}
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-[var(--whatsapp)] text-[var(--on-dark)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
            >
              <Icon name="whatsapp" size="sm" />
              WhatsApp me a code
            </button>
            {error && <p className="text-[13px] text-[var(--error)]">{error}</p>}
            <button
              type="button"
              onClick={() => { setStep("identifier"); setError(null); }}
              className="w-full text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Use a different email or phone
            </button>
          </div>
        )}

        {step === "code" && (
          <form onSubmit={verifyCode} className="space-y-4">
            {info && <p className="text-[13px] text-[var(--text-secondary)] text-center">{info}</p>}
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
              onClick={() => sendCode(channel)}
              disabled={loading || cooldown > 0}
              className="w-full text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </form>
        )}

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

export default function FindBookingPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><p className="text-[var(--text-secondary)] text-[15px]">Loading…</p></div>}>
      <FindBookingInner />
    </Suspense>
  );
}
