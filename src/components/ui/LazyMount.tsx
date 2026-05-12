"use client";

import { useEffect, useRef, useState } from "react";

interface LazyMountProps {
  children: React.ReactNode;
  rootMargin?: string;
}

// Only mounts children when the placeholder enters the viewport.
// Prevents off-screen image-heavy sections from loading simultaneously,
// which causes iOS WebKit OOM kills on memory-constrained devices.
// rootMargin intentionally 0px — 200px caused simultaneous mounts on back-navigation
// when scroll position was restored, triggering the same OOM flood as initial load.
export function LazyMount({ children, rootMargin = "0px" }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [rootMargin]);

  if (mounted) return <>{children}</>;
  return <div ref={ref} />;
}
