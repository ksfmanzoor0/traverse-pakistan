"use client";

import { useEffect, useRef, useState } from "react";

interface LazyMountProps {
  children: React.ReactNode;
  rootMargin?: string;
  // Placeholder height keeps sections below the fold so they don't all fire
  // their IntersectionObserver simultaneously when scroll position is restored
  // on back-navigation (which would cause iOS WebKit OOM).
  minHeight?: string;
  // Mount immediately without waiting for IntersectionObserver. Reserved for
  // the first mobile section (LCP element) — using it on below-fold sections
  // would re-introduce the iOS OOM on scroll-restore that this component
  // exists to prevent.
  eager?: boolean;
}

export function LazyMount({ children, rootMargin = "200px", minHeight = "420px", eager = false }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(eager);

  useEffect(() => {
    if (eager) return;
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
  }, [rootMargin, eager]);

  if (mounted) return <>{children}</>;
  return <div ref={ref} style={{ minHeight }} />;
}
