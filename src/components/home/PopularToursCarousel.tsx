import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Carousel } from "@/components/ui/Carousel";
import { TourCard } from "@/components/tours/TourCard";
import { getAllTours, getFeaturedTours } from "@/services/tour.service";

const CAROUSEL_SLOTS = 10;

export async function PopularToursCarousel() {
  const [featured, allTours] = await Promise.all([getFeaturedTours(), getAllTours()]);

  // Featured tours come first (ordered by featured_rank via the service), then
  // any remaining tours fill the carousel up to CAROUSEL_SLOTS to avoid an
  // empty section when admin has featured fewer than the target count.
  const seen = new Set(featured.map((t) => t.slug));
  const filler = allTours.filter((t) => !seen.has(t.slug));
  const tours = [...featured, ...filler].slice(0, CAROUSEL_SLOTS);

  return (
    <section id="section-tours" className="relative bg-[var(--bg-primary)] pt-6 pb-20 sm:py-24" style={{ scrollMarginTop: "200px" }}>
      {/* Dot pattern — own overflow-hidden so the section can scroll horizontally on iOS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      </div>

      <Container wide className="relative">
        <SectionHeader
          title="Popular Tours"
          subtitle="Handpicked adventures across Pakistan's most stunning landscapes"
          linkText="View all group tours"
          linkHref="/grouptours"
        />
        <Carousel>
          {tours.map((tour) => (
            <TourCard key={tour.id} tour={tour} variant="carousel" />
          ))}
        </Carousel>
      </Container>
    </section>
  );
}
