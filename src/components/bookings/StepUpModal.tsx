"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";

interface Props {
  bookingRef: string;
  onClose: () => void;
  onVerified: () => void;
}

const RESEND_COOLDOWN = 30;

export function StepUpModal({ bookingRef, onClose, onVerified }: Props) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const sentRef = useRef(false);

  const triggerSend = useCallback(async () => {
    setError(null);
    setResending(true);
    try {
      await fetch(`/api/bookings/${bookingRef}/step-up`, { method: "POST" });
      setCooldown(RESEND_COOLDOWN);
    } catch {
      setError("Could not send the verification link. Please try again.");
    } finally {
      setResending(false);
    }
  }, [bookingRef]);

  // Send once on open.
  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;
    triggerSend();
  }, [triggerSend]);

  // Cooldown countdown for the resend control.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Listen for SIGNED_IN in any tab (broadcasts via storage event). When the
  // magic link is tapped in email/WhatsApp on another tab or device, the
  // session here updates — close the modal and refresh the page.
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        onVerified();
        router.refresh();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [onVerified, router]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/${bookingRef}/step-up`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
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
      onVerified();
      router.refresh();
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
          <h2 className="text-[17px] font-bold text-[var(--text-primary)]">Verify to manage booking</h2>
          <button type="button" onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer">
            <Icon name="x" size="sm" />
          </button>
        </div>

        <p className="text-[14px] text-[var(--text-secondary)]">
          A sign-in link has been sent to your email and WhatsApp. Tap it to manage your booking — or enter the 6-digit code below.
        </p>

        <form onSubmit={verify} className="space-y-4">
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
            onClick={triggerSend}
            disabled={resending || cooldown > 0}
            className="w-full text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : resending ? "Sending…" : "Resend code"}
          </button>
        </form>
      </div>
    </div>
  );
}
