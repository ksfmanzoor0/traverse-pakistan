import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Carousel } from "@/components/ui/Carousel";
import { PackageCard } from "@/components/packages/PackageCard";
import { getAllPackages } from "@/services/package.service";

const MIN_SLOTS = 4;
const MAX_SLOTS = 10;

export async function FeaturedPackagesCarousel() {
  const all = await getAllPackages();

  // Mirror the admin Home Ordering sort: featured first, then explicit rank
  // (nulls last), then newest first, then name. Show at least MIN_SLOTS so
  // the section never looks half-empty.
  const sorted = [...all].sort((a, b) => {
    const fa = a.featured ? 1 : 0;
    const fb = b.featured ? 1 : 0;
    if (fa !== fb) return fb - fa;
    const ra = a.featuredRank ?? null;
    const rb = b.featuredRank ?? null;
    if (ra !== null && rb !== null && ra !== rb) return ra - rb;
    if (ra !== null) return -1;
    if (rb !== null) return 1;
    const ud = (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");
    if (ud !== 0) return ud;
    return a.name.localeCompare(b.name);
  });
  const featuredCount = sorted.filter((p) => p.featured).length;
  const target = Math.min(MAX_SLOTS, Math.max(featuredCount, MIN_SLOTS));
  const packages = sorted.slice(0, target);

  return (
    <section id="section-packages" className="relative bg-[var(--bg-dark)] pt-6 pb-20 sm:py-24" style={{ scrollMarginTop: "200px" }}>
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
          subtitle="Tailor Made tours — Your dates, Your tier!"
          linkText="View all packages"
          linkHref="/packages"
          light
        />
        <Carousel>
          {packages.map((pkg, i) => (
            <PackageCard key={pkg.id} pkg={pkg} variant="carousel" priority={i === 0} />
          ))}
        </Carousel>
      </Container>
    </section>
  );
}
