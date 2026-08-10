"use client";

import { useEffect, useState } from "react";

// Cross-component departure-city sync. The tour detail page mounts
// BookingSidebar and ItineraryAccordion as independent client component
// trees; they can't share React state directly. A tiny CustomEvent bus
// keeps both in lockstep without wiring URL params or a global store.
//
// Usage:
//   const [city, setCity] = useSharedDepartureCity("islamabad", tour.slug);
// The second argument scopes the module-level cache so navigating to a
// different tour doesn't inherit a stale value (e.g. LHE picked on tour A
// wouldn't leak into tour B whose anchor is KHI).

export type SharedDepartureCity = "islamabad" | "lahore" | "karachi" | "skardu";

const EVENT = "tp-departure-city-change";

// Module-level cache keyed by scope (tour slug). A late-mounting subscriber
// on the same scope picks up whatever the current selection is; a different
// scope starts fresh from the initial value.
const cacheByScope = new Map<string, SharedDepartureCity>();
const GLOBAL_SCOPE = "__global__";

export function useSharedDepartureCity(
  initial: SharedDepartureCity = "islamabad",
  scope: string = GLOBAL_SCOPE,
) {
  const [city, setCityState] = useState<SharedDepartureCity>(
    () => cacheByScope.get(scope) ?? initial,
  );

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = e as CustomEvent<{ scope: string; city: SharedDepartureCity }>;
      if (detail.detail?.scope === scope && detail.detail?.city) {
        setCityState(detail.detail.city);
      }
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, [scope]);

  // If the scope changes (user navigated to a different tour) reset local
  // state to whatever the new scope has cached or the initial fallback.
  useEffect(() => {
    setCityState(cacheByScope.get(scope) ?? initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  function setCity(next: SharedDepartureCity) {
    cacheByScope.set(scope, next);
    setCityState(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: { scope, city: next } }));
    }
  }

  return [city, setCity] as const;
}
