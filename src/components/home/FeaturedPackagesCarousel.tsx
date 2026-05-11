import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Carousel } from "@/components/ui/Carousel";
import { PackageCard } from "@/components/packages/PackageCard";
import { getFeaturedPackages } from "@/services/package.service";

export async function FeaturedPackagesCarousel() {
  const packages = await getFeaturedPackages();

  return (
    <section id="section-packages" className="relative bg-[var(--bg-dark)] py-20 sm:py-24" style={{ scrollMarginTop: "120px" }}>
      {/* Dot pattern — own overflow-hidden so the section can scroll horizontally on iOS */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }}
        />
      </div>

      <Container wide className="relative">
        <SectionHeader
          title="Design Your Dream Journey"
          subtitle="Your dates. Your tier. Tailor Made tours with hand-picked hotels that elevates the journey as you Traverse beyond the maps"
          linkText="View all packages"
          linkHref="/packages"
          light
        />
        <Carousel>
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} variant="carousel" />
          ))}
        </Carousel>
      </Container>
    </section>
  );
}
