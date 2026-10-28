"use client";

import dynamic from "next/dynamic";
import type { DestinationOption } from "@/components/home/SearchWidget";

// ssr:false prevents SearchWidget (framer-motion LayoutGroup) from mounting on
// mobile where HeroSection is CSS-hidden — avoids iOS WebKit crash on home page.
const HeroSection = dynamic(
  () => import("@/components/home/HeroSection").then((m) => m.HeroSection),
  { ssr: false }
);

type HeroSlide = { url: string; alt: string; focalPoint?: "top" | "center" | "bottom" };

export function HeroSectionWrapper({
  destinations,
  slides,
}: {
  destinations: DestinationOption[];
  slides?: HeroSlide[];
}) {
  return <HeroSection destinations={destinations} slides={slides} />;
}
