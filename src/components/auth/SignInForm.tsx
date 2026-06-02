"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { Icon } from "@/components/ui/Icon";

const RESEND_COOLDOWN = 30;

function getCallbackUrl(next: string) {
  if (typeof window === "undefined") return next;
  const base = window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH ?? "");
  const target = next.startsWith("/") ? next : `/${next}`;
  return `${base}/auth/callback?next=${encodeURIComponent(target)}`;
}

const inputCls =
  "w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors";

function GoogleButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 flex items-center justify-center gap-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)] transition-colors text-[14px] font-semibold text-[var(--text-primary)] cursor-pointer disabled:opacity-50"
    >
      {/* Google brand SVG — not an app icon, kept inline per brand requirements */}
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
      </svg>
      Continue with Google
    </button>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-[var(--border-default)]" />
      <span className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">or</span>
      <div className="flex-1 h-px bg-[var(--border-default)]" />
    </div>
  );
}

function SignInInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("redirect") || search.get("next") || "/mybookings";

  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(search.get("error"));
  const [sent, setSent] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const triggerSend = useCallback(async (targetEmail: string) => {
    const res = await fetch("/api/auth/send-magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: targetEmail, next }),
    });
    if (!res.ok) throw new Error("Could not send sign-in link. Please try again.");
  }, [next]);

  async function resendCode() {
    if (cooldown > 0 || resending) return;
    setCodeError(null);
    setResending(true);
    try {
      await triggerSend(email.trim());
      setCode("");
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Could not send a new code");
    } finally {
      setResending(false);
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="p-6 border border-[var(--border-default)] rounded-[var(--radius-md)] bg-[var(--bg-subtle)] text-center text-[14px] text-[var(--text-secondary)]">
        Authentication is not yet configured. Please message us on WhatsApp to book.
      </div>
    );
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code }),
      });
      const data = await res.json();
      if (!res.ok || !data.tokenHash) {
        setCodeError(data.error ?? "Invalid or expired code");
        return;
      }
      // Exchange the server-minted magic-link token for a real session.
      const supabase = getSupabaseBrowser();
      const { error: err } = await supabase.auth.verifyOtp({
        token_hash: data.tokenHash,
        type: data.type ?? "magiclink",
      });
      if (err) {
        setCodeError(err.message);
        return;
      }
      router.replace(next);
      router.refresh();
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setVerifying(false);
    }
  }

  if (sent) {
    return (
      <div className="p-6 bg-[var(--primary-light)] border border-[var(--primary)]/30 rounded-[var(--radius-md)] space-y-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
            <Icon name="envelope" size="lg" color="var(--primary)" />
          </div>
          <p className="text-[16px] font-bold text-[var(--text-primary)]">Check your email</p>
          <p className="text-[13px] text-[var(--text-secondary)]">
            We sent a sign-in link to <span className="font-semibold">{email}</span>. Tap it to sign in — no password needed.
          </p>
        </div>

        {!showCode ? (
          <button
            type="button"
            onClick={() => setShowCode(true)}
            className="w-full text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Didn&apos;t get the link? Enter the 6-digit code instead
          </button>
        ) : (
          <form onSubmit={verifyCode} className="space-y-2 pt-1">
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
            {codeError && (
              <p className="text-[12px] text-[var(--error)] font-medium">
                {codeError}
              </p>
            )}
            <button
              type="submit"
              disabled={verifying || code.length !== 6}
              className="w-full h-10 bg-[var(--primary)] text-[var(--text-inverse)] text-[13px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {verifying ? "Verifying…" : "Confirm code"}
            </button>
            <button
              type="button"
              onClick={resendCode}
              disabled={cooldown > 0 || resending}
              className="w-full text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
            >
              {cooldown > 0 ? `Send a new code in ${cooldown}s` : resending ? "Sending…" : "Send a new code"}
            </button>
          </form>
        )}

        <button
          type="button"
          onClick={() => { setSent(false); setEmail(""); setShowCode(false); setCode(""); setCodeError(null); }}
          className="block mx-auto text-[12px] text-[var(--primary)] hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  async function handleGoogle() {
    setError(null);
    try {
      const { error: err } = await getSupabaseBrowser().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: getCallbackUrl(next) },
      });
      if (err) throw err;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await triggerSend(email.trim());
      setSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <GoogleButton onClick={handleGoogle} disabled={submitting} />

      <Divider />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
            Email address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            className={inputCls}
          />
        </div>

        {error && <p className="text-[13px] text-[var(--error)]">{error}</p>}

        <button
          type="submit"
          disabled={!email || submitting}
          className="w-full h-12 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {submitting ? "Sending…" : "Send sign-in link"}
        </button>

        <p className="text-center text-[12px] text-[var(--text-tertiary)]">
          We&apos;ll email you a one-tap sign-in link. No password needed.
        </p>
      </form>
    </div>
  );
}

export function SignInForm() {
  return (
    <Suspense fallback={<div className="h-40 flex items-center justify-center text-[var(--text-tertiary)]">Loading…</div>}>
      <SignInInner />
    </Suspense>
  );
}
