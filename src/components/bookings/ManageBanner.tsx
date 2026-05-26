"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { Icon } from "@/components/ui/Icon";

interface Props {
  bookingRef: string;
}

const RESEND_COOLDOWN = 30;

export function ManageBanner({ bookingRef }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sentFromUrl = searchParams?.get("sent") === "1";

  const [hasSent, setHasSent] = useState(sentFromUrl);
  const [sending, setSending] = useState(false);
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(sentFromUrl ? RESEND_COOLDOWN : 0);
  const stripped = useRef(false);

  // Strip ?sent=1 from URL once we've consumed it.
  useEffect(() => {
    if (!sentFromUrl || stripped.current) return;
    stripped.current = true;
    const next = new URLSearchParams(searchParams?.toString() ?? "");
    next.delete("sent");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [sentFromUrl, searchParams, pathname, router]);

  // Cooldown timer for the resend control.
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // When the magic link is clicked in any tab, Supabase broadcasts SIGNED_IN
  // via storage events. Refresh server components — the new session has
  // verified_via_otp = true, so canManage flips and BookingDetail re-renders
  // with full controls (this banner unmounts).
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        router.refresh();
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  const triggerSend = useCallback(async () => {
    setError(null);
    setSending(true);
    try {
      const res = await fetch(`/api/bookings/${bookingRef}/step-up`, { method: "POST" });
      if (!res.ok) {
        setError("Could not send the sign-in link. Please try again.");
        return;
      }
      setHasSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch {
      setError("Could not send the sign-in link. Please try again.");
    } finally {
      setSending(false);
    }
  }, [bookingRef]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setVerifying(true);
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
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div className="p-4 border border-[var(--primary)]/30 bg-[var(--primary-light)] rounded-[var(--radius-md)] space-y-3">
      <div className="flex items-start gap-3">
        <span className="shrink-0 mt-0.5 text-[var(--primary)]">
          <Icon name="lock" size="sm" />
        </span>
        <div className="flex-1 space-y-2">
          {hasSent ? (
            <>
              <p className="text-[14px] font-bold text-[var(--text-primary)]">Sign-in link sent</p>
              <p className="text-[13px] text-[var(--text-secondary)]">
                Tap the link in your email or WhatsApp to access edit and cancel options. This page will update automatically.
              </p>
            </>
          ) : (
            <>
              <p className="text-[14px] font-bold text-[var(--text-primary)]">Sign in to edit or cancel</p>
              <p className="text-[13px] text-[var(--text-secondary)]">
                We&apos;ll send a one-tap sign-in link to your email and WhatsApp.
              </p>
            </>
          )}
        </div>
      </div>

      {!hasSent && (
        <button
          type="button"
          onClick={triggerSend}
          disabled={sending}
          className="w-full h-10 bg-[var(--primary)] text-[var(--text-inverse)] text-[13px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {sending ? "Sending…" : "Send sign-in link"}
        </button>
      )}

      {hasSent && !showCode && (
        <button
          type="button"
          onClick={() => setShowCode(true)}
          className="w-full text-[14px] font-bold text-[var(--primary)] underline underline-offset-2 hover:text-[var(--primary-hover)] transition-colors cursor-pointer"
        >
          Didn&apos;t get the link? Enter the 6-digit code instead
        </button>
      )}

      {hasSent && showCode && (
        <form onSubmit={verify} className="space-y-2 pt-1">
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            autoFocus
            className="w-full h-11 px-4 text-center text-[18px] font-mono tracking-[0.3em] rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className="w-full h-10 bg-[var(--primary)] text-[var(--text-inverse)] text-[13px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {verifying ? "Verifying…" : "Confirm code"}
          </button>
          <button
            type="button"
            onClick={triggerSend}
            disabled={sending || cooldown > 0}
            className="w-full text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : sending ? "Sending…" : "Resend link / code"}
          </button>
        </form>
      )}

      {error && <p className="text-[12px] text-[var(--error)] font-medium">{error}</p>}
    </div>
  );
}
