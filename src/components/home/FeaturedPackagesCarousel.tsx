import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Carousel } from "@/components/ui/Carousel";
import { PackageCard } from "@/components/packages/PackageCard";
import { getFeaturedPackages } from "@/services/package.service";
import imageKitLoader from "@/lib/imageLoader";

// On mobile the first card of this carousel is the LCP element (HeroSection is
// desktop-only). We want the browser to discover its image during initial HTML
// parse — but only on mobile: on desktop HeroSection is the LCP and we don't
// want two high-priority preloads racing.
//
// Emit a manual <link rel="preload" media="(max-width: 767px)"> in the section
// body — React 19 hoists it to <head>. Desktop browsers see media doesn't match
// and skip the fetch entirely; mobile fetches at high priority.
function pickCoverImage(pkg: { slug: string; images: { url: string }[] }) {
  if (!pkg.images.length) return null;
  const cover = pkg.images.find((img) => /\/cover\./i.test(img.url));
  if (cover) return cover;
  let h = 0;
  for (let i = 0; i < pkg.slug.length; i++) h = (h * 31 + pkg.slug.charCodeAt(i)) & 0xffff;
  return pkg.images[h % pkg.images.length];
}

export async function FeaturedPackagesCarousel() {
  const packages = await getFeaturedPackages();
  const firstImage = packages[0] ? pickCoverImage(packages[0]) : null;
  // The card is 261px wide on mobile at DPR ~2, so 640 is a safe preload width
  // matching what Next.js will pick from its device-sizes list.
  const preloadHref = firstImage
    ? imageKitLoader({ src: firstImage.url, width: 640, quality: 70 })
    : null;

  return (
    <section id="section-packages" className="relative bg-[var(--bg-dark)] pt-6 pb-20 sm:py-24" style={{ scrollMarginTop: "200px" }}>
      {preloadHref && (
        // Preload without fetchPriority=high — on Slow 4G the high hint stole
        // bandwidth from CSS/fonts, delaying FCP by ~1.7s while only saving
        // ~500ms on LCP. Normal priority still lets the preload scanner
        // discover the URL during HTML parse.
        <link
          rel="preload"
          as="image"
          href={preloadHref}
          media="(max-width: 767px)"
        />
      )}

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
          {packages.map((pkg) => (
            <PackageCard key={pkg.id} pkg={pkg} variant="carousel" />
          ))}
        </Carousel>
      </Container>
    </section>
  );
}
