"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";

export type WishlistItemType = "tour" | "package" | "hotel";

interface WishlistContextValue {
  // Set of "type:slug" keys for O(1) membership checks
  items: Set<string>;
  isSaved: (type: WishlistItemType, slug: string) => boolean;
  toggle: (type: WishlistItemType, slug: string) => Promise<{ saved: boolean }>;
  loading: boolean;
}

const WishlistContext = createContext<WishlistContextValue>({
  items: new Set(),
  isSaved: () => false,
  toggle: async () => ({ saved: false }),
  loading: false,
});

function makeKey(type: WishlistItemType, slug: string) {
  return `${type}:${slug}`;
}

// WishlistProvider — loads the signed-in user's wishlist once on mount, then
// keeps it in memory so cards across the page reflect saved state without each
// one making its own request. Logged-out users get an empty set; the heart
// click is handled by the WishlistButton component (sign-in prompt).
const PENDING_KEY = "pendingWishlistAdd";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setItems(new Set()); setLoaded(false); return; }
    let cancelled = false;
    setLoading(true);
    fetch("/api/account/wishlist")
      .then((res) => res.ok ? res.json() : { items: [] })
      .then((data) => {
        if (cancelled) return;
        const next = new Set<string>();
        for (const row of data.items as { item_type: WishlistItemType; item_slug: string }[]) {
          next.add(makeKey(row.item_type, row.item_slug));
        }
        setItems(next);
        setLoaded(true);
      })
      .catch(() => { /* silent — wishlist is non-critical */ })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const isSaved = useCallback(
    (type: WishlistItemType, slug: string) => items.has(makeKey(type, slug)),
    [items]
  );

  const toggle = useCallback(
    async (type: WishlistItemType, slug: string): Promise<{ saved: boolean }> => {
      const key = makeKey(type, slug);
      const currentlySaved = items.has(key);
      const nextSaved = !currentlySaved;

      // Optimistic update so the heart fills/empties instantly.
      setItems((prev) => {
        const next = new Set(prev);
        if (nextSaved) next.add(key);
        else next.delete(key);
        return next;
      });

      try {
        const res = await fetch("/api/account/wishlist", {
          method: nextSaved ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ itemType: type, itemSlug: slug }),
        });
        if (!res.ok) throw new Error("Wishlist update failed");
        return { saved: nextSaved };
      } catch (err) {
        // Roll back on failure.
        setItems((prev) => {
          const next = new Set(prev);
          if (currentlySaved) next.add(key);
          else next.delete(key);
          return next;
        });
        throw err;
      }
    },
    [items]
  );

  // Replay a pending save left by a logged-out heart tap. WishlistButton
  // stores the intent in sessionStorage, redirects to /auth/sign-in, and
  // after the user signs in (returning here via ?next=) we read the intent
  // and add the item. Runs once the initial wishlist load completes so we
  // don't accidentally toggle off something already saved.
  useEffect(() => {
    if (!user || !loaded) return;
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem(PENDING_KEY);
    if (!raw) return;
    window.sessionStorage.removeItem(PENDING_KEY);
    try {
      const { itemType, itemSlug } = JSON.parse(raw) as { itemType: WishlistItemType; itemSlug: string };
      if (items.has(makeKey(itemType, itemSlug))) return; // already saved
      toggle(itemType, itemSlug).catch(() => { /* silent */ });
    } catch {
      /* malformed — already cleared */
    }
  }, [user, loaded, items, toggle]);

  const value = useMemo<WishlistContextValue>(
    () => ({ items, isSaved, toggle, loading }),
    [items, isSaved, toggle, loading]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  return useContext(WishlistContext);
}
