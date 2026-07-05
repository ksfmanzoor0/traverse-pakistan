import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Carousel } from "@/components/ui/Carousel";
import { TourCard } from "@/components/tours/TourCard";
import { getAllTours } from "@/services/tour.service";

// Hand-pinned slots in the Popular Tours carousel.
const PINNED_POSITIONS: Record<number, string> = {
  0: "trip-to-hunza-naltar-khunjerab",
  1: "trip-to-minimarg",
  2: "trip-to-skardu-basho-deosai-khaplu",
  3: "k2-base-camp-trek",
};

export async function PopularToursCarousel() {
  const allTours = await getAllTours();

  const pinnedSlugs = new Set(Object.values(PINNED_POSITIONS));
  const rest = allTours.filter((t) => !pinnedSlugs.has(t.slug));
  const pinnedBySlug = new Map(allTours.filter((t) => pinnedSlugs.has(t.slug)).map((t) => [t.slug, t]));

  const ordered: typeof allTours = [];
  let restCursor = 0;
  for (let i = 0; i < 10; i++) {
    const pinnedSlug = PINNED_POSITIONS[i];
    const pinned = pinnedSlug ? pinnedBySlug.get(pinnedSlug) : undefined;
    if (pinned) {
      ordered.push(pinned);
    } else if (restCursor < rest.length) {
      ordered.push(rest[restCursor++]);
    }
  }
  const tours = ordered;

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
