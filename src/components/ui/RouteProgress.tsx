"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Top-of-page navigation progress bar.
 * Starts on in-app link clicks; completes when the route actually changes.
 * Auto-completes after a safety timeout so it never sticks.
 */
export function RouteProgress() {
  const pathname = usePathname() ?? "";
  const search = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [slowVisible, setSlowVisible] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const start = () => {
    clearTimers();
    setVisible(true);
    setProgress(18);
    timers.current.push(window.setTimeout(() => setProgress(45), 180));
    timers.current.push(window.setTimeout(() => setProgress(72), 500));
    // Slow-connection reassurance: after 700ms, show the brand emblem.
    timers.current.push(window.setTimeout(() => setSlowVisible(true), 700));
    timers.current.push(window.setTimeout(() => setProgress(88), 1100));
    // Safety — if route never changes, clean up.
    timers.current.push(window.setTimeout(() => finish(), 15000));
  };

  const finish = () => {
    clearTimers();
    setProgress(100);
    setSlowVisible(false);
    timers.current.push(
      window.setTimeout(() => {
        setVisible(false);
      }, 180)
    );
    timers.current.push(
      window.setTimeout(() => {
        setProgress(0);
      }, 420)
    );
  };

  // Intercept in-app link clicks to show immediate feedback.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const link = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link) return;
      const href = link.getAttribute("href") || "";
      if (!href || href.startsWith("#")) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search &&
          url.hash !== ""
        ) {
          return;
        }
      } catch {
        return;
      }
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // When the route actually changes, finish the bar.
  useEffect(() => {
    if (!visible) return;
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  useEffect(() => () => clearTimers(), []);

  return (
    <>
      <div
        role="progressbar"
        aria-hidden={!visible}
        className="route-progress-bar"
        style={{
          transform: `scaleX(${progress / 100})`,
          opacity: visible ? 1 : 0,
        }}
      />
      {slowVisible && (
        <div className="route-progress-slow" aria-hidden="true">
          <svg
            className="route-progress-emblem"
            viewBox="0 0 80 80"
            width="56"
            height="56"
            fill="currentColor"
            aria-hidden="true"
          >
            <polygon points="40,11 7,67 73,67" />
            <polygon points="40,11 52,30 66,56 73,67 53,67" />
            <polygon points="40,11 37,22 38,34 42,50 45,67 40,67 37,48 36,32 38,20" />
            <polygon points="34,67 38,50 43,51 46,67" />
            <polygon points="7,67 16,52 24,60 22,67" />
            <polygon points="57,67 60,53 68,60 73,67" />
          </svg>
        </div>
      )}
    </>
  );
}
