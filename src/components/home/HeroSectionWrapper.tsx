"use client";

import dynamic from "next/dynamic";
import type { DestinationOption } from "@/components/home/SearchWidget";

// ssr:false prevents SearchWidget (framer-motion LayoutGroup) from mounting on
// mobile where HeroSection is CSS-hidden — avoids iOS WebKit crash on home page.
//
// But without SSR the server renders nothing here on desktop, then hydration
// pushes every below-fold section down → PSI reports CLS ~0.4. Give dynamic()
// a loading placeholder that reserves the same vertical space HeroSection will
// occupy, so hydration swaps in-place instead of shifting layout.
//
// The section's rendered height is content-driven (min-h-540 + pt-6 + pb-24
// gives ~660px minimum, but the expanded search widget + wrapping subtitle
// push it closer to 780px on desktop viewports). Sandbox CLS held at 0.535
// with a 660px placeholder — that's the slack between what we reserved and
// what actually hydrates. Bump to 780px so hydration lands in-place.
const HERO_PLACEHOLDER_HEIGHT = "780px";

const HeroSection = dynamic(
  () => import("@/components/home/HeroSection").then((m) => m.HeroSection),
  {
    ssr: false,
    loading: () => (
      <section
        aria-hidden
        className="relative hidden md:block bg-[var(--bg-dark)]"
        style={{ minHeight: HERO_PLACEHOLDER_HEIGHT }}
      />
    ),
  }
);

export function HeroSectionWrapper({ destinations }: { destinations: DestinationOption[] }) {
  return <HeroSection destinations={destinations} />;
}
