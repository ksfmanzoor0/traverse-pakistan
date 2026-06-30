"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWishlist, type WishlistItemType } from "@/components/auth/WishlistProvider";

interface WishlistButtonProps {
  itemType: WishlistItemType;
  itemSlug: string;
  savedCount?: number;
  className?: string;
}

export function WishlistButton({ itemType, itemSlug, savedCount, className }: WishlistButtonProps) {
  const { user } = useAuth();
  const { isSaved, toggle } = useWishlist();
  const router = useRouter();
  const pathname = usePathname() ?? "/";
  const [busy, setBusy] = useState(false);

  const saved = isSaved(itemType, itemSlug);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    if (!user) {
      // Logged-out — stash the intent so WishlistProvider can replay the add
      // after sign-in, then carry the current path forward so they return
      // to this card.
      try {
        window.sessionStorage.setItem(
          "pendingWishlistAdd",
          JSON.stringify({ itemType, itemSlug })
        );
      } catch { /* private mode / quota — sign-in flow still proceeds */ }
      const next = encodeURIComponent(pathname);
      router.push(`/auth/sign-in?next=${next}`);
      return;
    }

    setBusy(true);
    try {
      await toggle(itemType, itemSlug);
    } catch {
      /* Provider already rolled back; silent for now. */
    } finally {
      setBusy(false);
    }
  };

  const displayCount = savedCount !== undefined
    ? saved ? savedCount + 1 : savedCount
    : undefined;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer backdrop-blur-sm active:scale-95 disabled:opacity-70 disabled:cursor-wait",
        saved ? "text-[var(--error)]" : "text-[var(--on-dark)]",
        className
      )}
      style={{
        background: saved ? "rgba(255,255,255,0.94)" : "rgba(0,0,0,0.32)",
      }}
      aria-label={saved ? "Remove from wishlist" : "Save to wishlist"}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={saved ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
        className={saved ? "motion-safe:animate-[wishlistPop_320ms_cubic-bezier(0.34,1.56,0.64,1)]" : ""}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {displayCount !== undefined && displayCount > 0 && (
        <span className="text-[11px] font-semibold tabular-nums">
          {displayCount.toLocaleString()}
        </span>
      )}
    </button>
  );
}
