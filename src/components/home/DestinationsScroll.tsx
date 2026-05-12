import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Carousel } from "@/components/ui/Carousel";
import { formatPrice } from "@/lib/utils";
import { getAllDestinations } from "@/services/destination.service";

const FEATURED_ORDER = [
  "hunza", "skardu", "chitral", "fairy-meadows",
  "kaghan", "swat", "neelam-valley", "makran",
];

export async function DestinationsScroll() {
  const all = await getAllDestinations();
  const destinations = all
    .filter((d) => !d.parentSlug && d.heroImage)
    .sort((a, b) => {
      const ai = FEATURED_ORDER.indexOf(a.slug);
      const bi = FEATURED_ORDER.indexOf(b.slug);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return (b.startingPrice ?? 0) - (a.startingPrice ?? 0);
    })
    .slice(0, 8);
  return (
    <section className="bg-[var(--bg-primary)] py-20 sm:py-24">
      <Container wide>
        <SectionHeader
          title="Explore Destinations"
          subtitle="From the peaks of Karakoram to the beaches of Makran"
          linkText="View all destinations"
          linkHref="/destinations"
        />
        <Carousel>
          {destinations.map((dest) => (
            <Link
              key={dest.id}
              href={`/destinations/${dest.slug}`}
              className="group min-w-[300px] w-[300px] sm:min-w-[340px] sm:w-[340px] h-[440px] relative rounded-[var(--radius-lg)] overflow-hidden flex flex-col justify-end"
            >
              {/* Image with scale on hover */}
              <Image
                src={dest.heroImage}
                alt={dest.name}
                fill
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.06]"
                sizes="(max-width: 640px) 300px, 340px"
              />

              {/* Strong gradient — 3 layers for max readability */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/70 to-transparent" />

              {/* Content */}
              <div className="relative p-6 sm:p-7">
                {/* Region tag */}
                <span className="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-[var(--on-dark-glass-hover)] backdrop-blur-sm text-[var(--on-dark)] rounded-[var(--radius-full)] mb-3">
                  {dest.regionSlug.replace(/-/g, " ")}
                </span>

                {/* Name — large, bold, with text shadow */}
                <h3
                  className="text-[24px] sm:text-[26px] font-bold text-[var(--on-dark)] leading-tight tracking-[-0.02em]"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
                >
                  {dest.name}
                </h3>

                {/* Meta with clear contrast */}
                <p
                  className="text-[14px] text-[var(--on-dark)] mt-2 font-medium"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}
                >
                  From {formatPrice(dest.startingPrice)} &middot; {dest.tourCount} tours
                </p>

                {/* Explore CTA with animated arrow */}
                <span className="inline-flex items-center gap-1.5 mt-4 text-[13px] font-semibold text-[var(--primary-muted)] group-hover:gap-3 transition-all duration-300">
                  Explore
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform duration-300 group-hover:translate-x-1">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </span>
              </div>

              {/* Hover glow effect */}
              <div className="absolute inset-0 ring-1 ring-inset ring-transparent group-hover:ring-[var(--on-dark-glass-hover)] transition-all duration-500 rounded-[var(--radius-lg)]" />
            </Link>
          ))}
        </Carousel>
      </Container>
    </section>
  );
}
