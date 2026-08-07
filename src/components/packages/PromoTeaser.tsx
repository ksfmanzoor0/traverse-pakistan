"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { formatPrice } from "@/lib/utils";

type PromoState =
  | { status: "loading" }
  | { status: "logged-out" }
  | { status: "unused"; code: string; discount: number }
  | { status: "used" };

/**
 * Contextual promo teaser that sits on the package detail sidebar / mobile
 * booking bar. Three states:
 *  - Logged out → "Sign in to unlock PKR 14,000 off"
 *  - Logged in with unused code → "Your code TraverseNN — PKR 14,000 off"
 *  - Logged in with used code → renders nothing (no dead space)
 *
 * Fetches once per session via /api/promo/apply's sibling GET, or just skips
 * the fetch entirely when the user is logged out. Runs client-side because
 * auth state resolves post-hydration.
 */
export function PromoTeaser({ compact }: { compact?: boolean }) {
  const { user, loading } = useAuth();
  const pathname = usePathname() ?? "/";
  const [state, setState] = useState<PromoState>({ status: "loading" });

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setState({ status: "logged-out" });
      return;
    }
    let cancelled = false;
    fetch("/api/promo/me", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: { code?: string; discount_amount?: number; used_at?: string | null }) => {
        if (cancelled) return;
        if (!j.code) {
          setState({ status: "logged-out" });
          return;
        }
        if (j.used_at) {
          setState({ status: "used" });
          return;
        }
        setState({ status: "unused", code: j.code, discount: j.discount_amount ?? 14000 });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "logged-out" });
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  if (state.status === "loading" || state.status === "used") return null;

  const signInHref = `/auth/sign-in?next=${encodeURIComponent(pathname)}`;

  if (compact) {
    // Mobile bar / compact contexts — one-line pill above the CTA
    return state.status === "logged-out" ? (
      <Link
        href={signInHref}
        className="flex items-center gap-2 h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--primary-light)] text-[12px] font-semibold text-[var(--primary-deep)]"
      >
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--primary)]" />
        Sign in for PKR 14,000 off →
      </Link>
    ) : (
      <div className="flex items-center gap-2 h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--primary-light)] text-[12px] font-semibold text-[var(--primary-deep)]">
        <span className="inline-block w-2 h-2 rounded-full bg-[var(--primary)]" />
        <span className="font-mono">{state.code}</span> · {formatPrice(state.discount)} off at checkout
      </div>
    );
  }

  // Sidebar block — two-line with icon
  return state.status === "logged-out" ? (
    <Link
      href={signInHref}
      className="mt-4 flex items-start gap-3 p-3 rounded-[var(--radius-sm)] border border-[var(--primary)]/25 bg-[var(--primary-light)]/60 hover:border-[var(--primary)]/50 transition-colors"
    >
      <span
        aria-hidden
        className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary-deep)] text-[15px] font-bold"
      >
        %
      </span>
      <span className="text-[12px] leading-snug text-[var(--text-primary)]">
        <span className="font-bold">Sign in to unlock PKR 14,000 off</span>
        <span className="block text-[var(--text-secondary)] mt-0.5">Every Traverser gets a personal code.</span>
      </span>
    </Link>
  ) : (
    <div className="mt-4 flex items-start gap-3 p-3 rounded-[var(--radius-sm)] border border-[var(--primary)]/25 bg-[var(--primary-light)]/60">
      <span
        aria-hidden
        className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary)]/15 flex items-center justify-center text-[var(--primary-deep)] text-[15px] font-bold"
      >
        %
      </span>
      <span className="text-[12px] leading-snug text-[var(--text-primary)]">
        <span className="font-bold font-mono">{state.code}</span>
        <span className="block text-[var(--text-secondary)] mt-0.5">
          Apply at checkout for {formatPrice(state.discount)} off.
        </span>
      </span>
    </div>
  );
}
