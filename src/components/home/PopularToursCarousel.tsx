import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Carousel } from "@/components/ui/Carousel";
import { TourCard } from "@/components/tours/TourCard";
import { getAllTours } from "@/services/tour.service";

export async function PopularToursCarousel() {
  const allTours = await getAllTours();
  const tours = allTours.slice(0, 10);

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
