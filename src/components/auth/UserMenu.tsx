"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { Icon } from "@/components/ui/Icon";

function initials(name?: string | null, email?: string | null) {
  const src = (name || email || "").trim();
  if (!src) return "•";
  const parts = src.split(/\s+|@/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const ref = useRef<HTMLDivElement>(null);

  // Pass the current page as ?next= so post-sign-in lands the user back
  // where they clicked. Skip when already on an auth page (would loop).
  const signInHref = pathname.startsWith("/auth")
    ? "/auth/sign-in"
    : `/auth/sign-in?next=${encodeURIComponent(pathname)}`;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (loading) {
    return <div className="w-9 h-9 rounded-full bg-[var(--bg-subtle)] animate-pulse" aria-hidden />;
  }

  if (!user) {
    return (
      <Link
        href={signInHref}
        className="w-9 h-9 rounded-full border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--primary)] hover:bg-[var(--bg-subtle)] transition-colors"
        aria-label="Sign in"
      >
        <Icon name="user" size="md" />
      </Link>
    );
  }

  // `name` is set by silent-signup + Settings; `full_name` is what Supabase
  // auto-populates for Google OAuth — fall back to that.
  const name = ((user.user_metadata?.name ?? user.user_metadata?.full_name) as string | undefined) ?? user.email;
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-9 h-9 rounded-full border border-[var(--border-default)] overflow-hidden hover:border-[var(--primary)] transition-colors cursor-pointer flex items-center justify-center bg-[var(--bg-subtle)]"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[12px] font-bold text-[var(--text-primary)]">
            {initials((user.user_metadata?.name ?? user.user_metadata?.full_name) as string | undefined, user.email)}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-64 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] overflow-hidden z-50"
          style={{ boxShadow: "var(--shadow-lg)" }}
        >
          <div className="px-4 py-3 border-b border-[var(--border-default)]">
            <p className="text-[13px] font-semibold text-[var(--text-primary)] truncate">{name}</p>
            {user.email && user.email !== name && (
              <p className="text-[11px] text-[var(--text-tertiary)] truncate">{user.email}</p>
            )}
          </div>
          <nav className="py-1">
            {[
              { href: "/account", label: "Account" },
              { href: "/mybookings", label: "My Bookings" },
              { href: "/account/wishlist", label: "Wishlist" },
              { href: "/account/settings", label: "Settings" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-2 text-[13px] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            type="button"
            onClick={async () => {
              setOpen(false);
              await signOut();
              router.push("/");
              router.refresh();
            }}
            className="w-full text-left px-4 py-2.5 text-[13px] text-[var(--error)] border-t border-[var(--border-default)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
