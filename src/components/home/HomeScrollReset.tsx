"use client";

import { useEffect } from "react";

// Scrolls to top on client-side navigation to home.
// Without this, Next.js restores the previous scroll position, causing multiple
// LazyMount sections to fire their IntersectionObserver simultaneously → iOS OOM.
export function HomeScrollReset() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  return null;
}
