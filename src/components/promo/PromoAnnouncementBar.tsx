"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

const DISMISS_KEY = "traverse_promo_bar_dismissed";

/**
 * Site-wide top announcement bar for logged-out visitors. Nudges signup
 * with the PKR 14,000 first-package discount.
 *
 * Renders nothing when: auth still loading, user is logged in, user
 * dismissed it this session, or on auth pages (avoids nudging on the very
 * page it links to).
 *
 * Dismiss is per session (sessionStorage) — re-appears on next visit,
 * which is intentional: a discount nudge is not a modal to be permanently
 * silenced, and users often need multiple touches before they sign up.
 *
 * Not sticky — scrolls away with the page to preserve mobile vertical
 * real estate. The sticky navbar and mobile search pill already occupy
 * the top viewport.
 */
export function PromoAnnouncementBar() {
  const { user, loading } = useAuth();
  const pathname = usePathname() ?? "/";
  const [dismissed, setDismissed] = useState(true); // Start hidden; enable post-hydration only

  useEffect(() => {
    if (loading || user) return;
    try {
      if (sessionStorage.getItem(DISMISS_KEY)) return;
    } catch {
      return; // Private mode / storage denied
    }
    setDismissed(false);
  }, [loading, user]);

  function dismiss(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  }

  if (dismissed || loading || user) return null;
  if (pathname.startsWith("/auth")) return null;

  const signInHref = `/auth/sign-in?next=${encodeURIComponent(pathname)}`;

  return (
    <Link
      href={signInHref}
      rel="nofollow"
      role="banner"
      aria-label="Sign up free to unlock PKR 14,000 off your first package"
      className="relative flex items-center justify-center gap-2 h-9 px-10 sm:px-12 bg-[var(--primary)] text-[var(--text-inverse)] text-[12px] sm:text-[13px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
    >
      <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-inverse)] opacity-80" />
      <span className="sm:hidden truncate">
        PKR 14,000 off first booking · sign up →
      </span>
      <span className="hidden sm:inline truncate">
        New to Traverse? Sign up free — get PKR 14,000 off your first package →
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-1 top-1/2 -translate-y-1/2 w-11 h-11 flex items-center justify-center text-[var(--text-inverse)] opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </Link>
  );
}
