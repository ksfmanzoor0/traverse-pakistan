import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { HeroSection } from "@/components/home/HeroSection";
import { MobileHomeContent } from "@/components/home/MobileHomeContent";
import { getDestinationOptions } from "@/services/destination.service";
import { StatsBar } from "@/components/home/StatsBar";
import { PopularToursCarousel } from "@/components/home/PopularToursCarousel";
import { TravelStylesGrid } from "@/components/home/TravelStylesGrid";
import { FeaturedPackagesCarousel } from "@/components/home/FeaturedPackagesCarousel";
import { DestinationsScroll } from "@/components/home/DestinationsScroll";
import { FeaturedHotels } from "@/components/home/FeaturedHotels";
import { BlogGrid } from "@/components/home/BlogGrid";
import { WhyUsSection } from "@/components/home/WhyUsSection";
import { ReviewsCarousel } from "@/components/home/ReviewsCarousel";
import { buildMetadata } from "@/lib/seo/metadata";

// VideoStories is deep below the fold and ships a client modal — defer its JS chunk
// so it doesn't compete with above-the-fold hydration. SSR stays on (SEO + no layout shift).
const VideoStories = dynamic(() =>
  import("@/components/home/VideoStories").then((m) => m.VideoStories),
);

export const metadata: Metadata = buildMetadata({
  title:
    "Pakistan Tours & Holiday Packages — 4.9★ Rated Tour Operator | Traverse Pakistan",
  description:
    "Book Pakistan group tours, custom trips, and hotels with the highest-rated tour operator. 22 tours across Hunza, Skardu, Chitral, K2 BC. 4.9★ from 1,300+ travelers.",
  path: "/",
  tags: [
    "Pakistan tours",
    "Hunza tour package",
    "Skardu tour package",
    "Pakistan travel agency",
    "Gilgit-Baltistan tours",
  ],
});

export default async function Home() {
  const destinations = await getDestinationOptions().catch(() => []);

  return (
    <>
      {/* Desktop hero — hidden on mobile */}
      <HeroSection destinations={destinations} />

      {/* Mobile home — search pill + tabs + featured cards */}
      <MobileHomeContent destinations={destinations} />

      <div className="hidden md:block"><StatsBar /></div>
      <FeaturedPackagesCarousel />
      <PopularToursCarousel />
      <FeaturedHotels />
      <DestinationsScroll />
      <TravelStylesGrid />
      <BlogGrid />
      <VideoStories />
      <WhyUsSection />
      <ReviewsCarousel />
    </>
  );
}
