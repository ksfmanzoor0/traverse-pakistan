import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Carousel } from "@/components/ui/Carousel";
import { TourCard } from "@/components/tours/TourCard";
import { getAllTours } from "@/services/tour.service";

const MIN_SLOTS = 4;
const MAX_SLOTS = 10;

export async function PopularToursCarousel() {
  const allTours = await getAllTours();

  // Mirror the admin Home Ordering sort so what admin sees at the top of the
  // list is exactly what shows on home: featured first, then explicit rank
  // (nulls last), then earliest upcoming departure, then name. Show at least
  // MIN_SLOTS so the section never looks half-empty.
  const sorted = [...allTours].sort((a, b) => {
    const fa = a.featured ? 1 : 0;
    const fb = b.featured ? 1 : 0;
    if (fa !== fb) return fb - fa;
    const ra = a.featuredRank ?? null;
    const rb = b.featuredRank ?? null;
    if (ra !== null && rb !== null && ra !== rb) return ra - rb;
    if (ra !== null) return -1;
    if (rb !== null) return 1;
    const ad = a.departureDate || "￿";
    const bd = b.departureDate || "￿";
    if (ad !== bd) return ad.localeCompare(bd);
    return a.name.localeCompare(b.name);
  });
  const featuredCount = sorted.filter((t) => t.featured).length;
  const target = Math.min(MAX_SLOTS, Math.max(featuredCount, MIN_SLOTS));
  const tours = sorted.slice(0, target);

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
