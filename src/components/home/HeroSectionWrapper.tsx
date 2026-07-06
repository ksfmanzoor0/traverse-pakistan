"use client";

import dynamic from "next/dynamic";
import type { DestinationOption } from "@/components/home/SearchWidget";

// ssr:false prevents SearchWidget (framer-motion LayoutGroup) from mounting on
// mobile where HeroSection is CSS-hidden — avoids iOS WebKit crash on home page.
const HeroSection = dynamic(
  () => import("@/components/home/HeroSection").then((m) => m.HeroSection),
  { ssr: false }
);

export function HeroSectionWrapper({ destinations }: { destinations: DestinationOption[] }) {
  return <HeroSection destinations={destinations} />;
}
