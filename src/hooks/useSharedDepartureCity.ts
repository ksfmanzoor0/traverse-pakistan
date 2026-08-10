"use client";

import { useEffect, useState } from "react";

// Cross-component departure-city sync. The tour detail page mounts
// BookingSidebar and ItineraryAccordion as independent client component
// trees; they can't share React state directly. A tiny CustomEvent bus
// keeps both in lockstep without wiring URL params or a global store.
//
// Usage:
//   const [city, setCity] = useSharedDepartureCity("islamabad");
// Every subscriber re-renders when any subscriber calls setCity.

export type SharedDepartureCity = "islamabad" | "lahore" | "karachi";

const EVENT = "tp-departure-city-change";

// Module-level cache so a component mounting AFTER a city was picked still
// starts with the latest value (event listeners only fire on future changes).
let cached: SharedDepartureCity | null = null;

export function useSharedDepartureCity(initial: SharedDepartureCity = "islamabad") {
  const [city, setCityState] = useState<SharedDepartureCity>(() => cached ?? initial);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<SharedDepartureCity>).detail;
      if (detail) setCityState(detail);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  function setCity(next: SharedDepartureCity) {
    cached = next;
    setCityState(next);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
    }
  }

  return [city, setCity] as const;
}
