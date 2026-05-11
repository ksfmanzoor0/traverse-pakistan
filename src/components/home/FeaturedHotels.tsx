import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Carousel } from "@/components/ui/Carousel";
import { Icon } from "@/components/ui/Icon";
import { formatPrice } from "@/lib/utils";
import { getFeaturedHotels } from "@/services/hotel.service";

export async function FeaturedHotels() {
  const hotels = await getFeaturedHotels(5);

  return (
    <section id="section-hotels" className="bg-[var(--bg-dark)] pt-6 pb-20 sm:py-24" style={{ scrollMarginTop: "200px" }}>
      <Container wide>
        <SectionHeader
          title="Popular Stays"
          subtitle="Handpicked hotels, guesthouses & camps across Pakistan"
          linkText="View all hotels"
          linkHref="/hotels"
          light
        />
        <Carousel>
          {hotels.map((hotel) => (
            <Link
              key={hotel.id}
              href={`/hotels/${hotel.slug}`}
              className="group min-w-[270px] w-[270px] sm:min-w-[340px] sm:w-[340px] rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-dark)] transition-all duration-300 hover:-translate-y-1"
              style={{ boxShadow: "var(--shadow-sm)" }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <Image
                  src={hotel.image}
                  alt={hotel.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  sizes="310px"
                />
                <div className="absolute top-3 left-3 flex gap-1.5">
                  {hotel.guestFavourite === true && (
                    <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-[var(--bg-primary)] text-[var(--text-primary)] rounded-[var(--radius-full)]">
                      GUEST FAV
                    </span>
                  )}
                  <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-[var(--primary)] text-[var(--on-dark)] rounded-[var(--radius-full)]">
                    {hotel.tier === "luxury" ? "LUXURY" : hotel.tier === "premium" ? "PREMIUM" : hotel.tier === "standard" ? "CAMP" : "GUEST FAV"}
                  </span>
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-[var(--bg-primary)]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
                    {hotel.propertyType}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[13px]">
                    <Icon name="star" size="sm" weight="fill" color="var(--primary-muted)" />
                    <span className="font-semibold text-[var(--text-primary)]">{hotel.rating}</span>
                    <span className="text-[var(--text-tertiary)]">({hotel.reviewCount})</span>
                  </span>
                </div>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                  {hotel.name}
                </h3>
                <p className="text-[12px] text-[var(--text-tertiary)] mt-1">{hotel.location}</p>
                <div className="mt-3 pt-3 border-t border-[var(--border-default)]">
                  <span className="text-[17px] font-bold text-[var(--text-primary)] tabular-nums">
                    {formatPrice(hotel.pricePerNight)}
                  </span>
                  <span className="text-[12px] text-[var(--text-tertiary)]"> / night</span>
                </div>
              </div>
            </Link>
          ))}
        </Carousel>
      </Container>
    </section>
  );
}
