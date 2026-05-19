"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: React.ReactNode;
  delayMs?: number;
  className?: string;
}

type ShowState = "hidden" | "immediate" | "animated";

export function Reveal({ children, delayMs = 0, className }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState<ShowState>("hidden");

  // Pre-paint: if already in viewport, show immediately with no animation
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const { top, bottom } = node.getBoundingClientRect();
    if (top < window.innerHeight && bottom > 0) {
      setShow("immediate");
    }
  }, []);

  // Post-paint: IntersectionObserver for below-fold elements only
  useEffect(() => {
    const node = ref.current;
    if (!node || show !== "hidden") return;
    if (typeof IntersectionObserver === "undefined") {
      setShow("animated");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShow("animated");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.05 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [show]);

  return (
    <div
      ref={ref}
      className={cn(
        show === "immediate" ? "opacity-100" :
        show === "animated" ? "reveal-rise" :
        "opacity-0",
        className
      )}
      style={show === "animated" && delayMs ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </div>
  );
}
