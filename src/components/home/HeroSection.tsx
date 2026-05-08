import Image from "next/image";
import { SearchWidget, type DestinationOption } from "./SearchWidget";

const MEDIA = "https://media.traversepakistan.com";

const heroImages = [15, 1, 9, 12, 14, 10].map((n) => ({
  url: `${MEDIA}/homepageslider/${n}.jpg`,
  alt: "Pakistan travel destination",
}));

export function HeroSection({ destinations = [] }: { destinations?: DestinationOption[] }) {
  return (
    <section className="relative hidden md:block">
      <div className="absolute inset-0 overflow-hidden">
        {heroImages.map((img, i) => (
          <div
            key={img.url}
            className="hero-slide absolute inset-0"
            style={{ animationDelay: `${-i * 6}s` }}
          >
            <Image
              src={img.url}
              alt={img.alt}
              fill
              priority={i === 0}
              fetchPriority={i === 0 ? "high" : "low"}
              sizes="100vw"
              quality={95}
              className="object-cover"
            />
          </div>
        ))}
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-[rgba(15,34,32,0.5)] via-[rgba(0,0,0,0.15)] to-[rgba(15,34,32,0.6)]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[540px] px-5 sm:px-8 pt-6 pb-24">
        <h1
          className="text-[var(--on-dark)] leading-[1.05] tracking-[-0.03em] font-extrabold text-center max-w-3xl"
          style={{
            fontSize: "clamp(1.75rem, 1.5rem + 3vw, 3.5rem)",
            textShadow: "0 2px 16px rgba(0,0,0,0.3)",
          }}
        >
          <span className="text-[var(--primary-muted)]">PAKISTAN</span> like never Before
        </h1>

        <p
          className="mt-3 text-[17px] text-[var(--on-dark-secondary)] max-w-[780px] mx-auto leading-relaxed text-center"
          style={{ textShadow: "0 1px 6px rgba(0,0,0,0.3)" }}
        >
          Bespoke journeys. Iconic landscapes. Unrivaled expertise across a vast realm; where the ancient echoes of Sindh meet the frozen cathedrals of K2.
        </p>

        {/* Search widget */}
        <div id="hero-search" className="w-full max-w-[920px] mt-4 relative z-20">
          <SearchWidget destinations={destinations} />
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--hero-fade)] to-transparent z-[5]" />
    </section>
  );
}
