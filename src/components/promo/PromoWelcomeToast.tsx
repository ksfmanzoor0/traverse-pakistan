"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatPrice } from "@/lib/utils";

const SEEN_KEY_PREFIX = "traverse_promo_seen_";

/**
 * Bottom-right welcome toast shown once per user, first time they land on
 * the site while signed in with an unused promo code. Dismissal is stored
 * in localStorage under a per-user key, so it doesn't re-fire on the same
 * device. New devices see it once each — acceptable trade for not touching
 * user_metadata every read.
 *
 * No-op when: loading, logged out, code already used, already dismissed, or
 * the API fails. Never blocks initial paint.
 */
export function PromoWelcomeToast() {
  const { user, loading } = useAuth();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "visible"; code: string; discount: number }
  >({ status: "idle" });

  useEffect(() => {
    if (loading || !user) return;
    const seenKey = `${SEEN_KEY_PREFIX}${user.id}`;
    try {
      if (localStorage.getItem(seenKey)) return;
    } catch {
      return; // Private-mode or storage denied — silently skip
    }
    let cancelled = false;
    fetch("/api/promo/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: { code?: string; discount_amount?: number; used_at?: string | null }) => {
        if (cancelled || !j.code || j.used_at) return;
        setState({ status: "visible", code: j.code, discount: j.discount_amount ?? 14000 });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  function dismiss() {
    if (user) {
      try {
        localStorage.setItem(`${SEEN_KEY_PREFIX}${user.id}`, new Date().toISOString());
      } catch {}
    }
    setState({ status: "idle" });
  }

  if (state.status !== "visible") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[80] w-[320px] max-w-[calc(100vw-2rem)] rounded-[var(--radius-md)] border border-[var(--primary)]/30 bg-[var(--bg-primary)] p-4 animate-in slide-in-from-bottom-4 fade-in duration-500"
      style={{ boxShadow: "var(--shadow-lg)" }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="shrink-0 w-10 h-10 rounded-full bg-[var(--primary-light)] text-[var(--primary-deep)] flex items-center justify-center text-[18px] font-bold"
        >
          %
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold text-[var(--text-primary)]">
            Welcome — your Traverser code is ready
          </p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1">
            <span className="font-mono font-semibold text-[var(--text-primary)]">{state.code}</span> — {formatPrice(state.discount)} off any package. One-time use.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Link
              href="/packages"
              onClick={dismiss}
              className="h-8 px-3 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[12px] font-bold inline-flex items-center hover:bg-[var(--primary-hover)] transition-colors"
            >
              Browse packages
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="h-8 px-2 text-[12px] font-semibold text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="shrink-0 w-6 h-6 -mt-1 -mr-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
