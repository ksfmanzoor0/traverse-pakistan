"use client";

import dynamic from "next/dynamic";
import type { DestinationOption } from "@/components/home/SearchWidget";

// ssr:false prevents SearchWidget (framer-motion LayoutGroup) from mounting on
// mobile where HeroSection is CSS-hidden — avoids iOS WebKit crash on home page.
//
// But without SSR the server renders nothing here on desktop, then hydration
// pushes every below-fold section down → PSI reports CLS ~0.4. Give dynamic()
// a loading placeholder that reserves the same vertical space HeroSection will
// occupy (min-h-[540px] content + pt-6 + pb-24 ≈ 660px on desktop), so hydration
// swaps in-place instead of shifting layout.
const HERO_PLACEHOLDER_HEIGHT = "660px";

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
