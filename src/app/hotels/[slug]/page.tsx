import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { MosaicGallery } from "@/components/trip-detail/MosaicGallery";
import { AccordionItem } from "@/components/ui/Accordion";
import { Icon } from "@/components/ui/Icon";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  hotelSchema,
  breadcrumbSchema,
  combineSchemas,
} from "@/lib/seo/schema";
import { formatPrice } from "@/lib/utils";
import { applyHotelMargin } from "@/lib/constants";
import { getHotelBySlug, getAllHotels, getHotelsByDestination } from "@/services/hotel.service";
import { listR2Images } from "@/lib/r2";
import Link from "next/link";
import { HotelBookingSidebar } from "@/components/hotels/HotelBookingSidebar";
import { HotelRoomsBookingClient } from "@/components/hotels/HotelRoomsBookingClient";
import { HotelRoomProvider } from "@/components/hotels/HotelRoomContext";

// Hotel pages re-validate every hour so R2 image uploads are picked up without a full rebuild
export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const hotels = await getAllHotels();
  return hotels.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);
  if (!hotel) {
    return buildMetadata({
      title: "Hotel Not Found",
      path: `/hotels/${slug}`,
      noIndex: true,
    });
  }
  const title = `${hotel.name} — ${hotel.location}`;
  const description = `${hotel.description.slice(0, 150)}${hotel.description.length > 150 ? "…" : ""}`;
  return buildMetadata({
    title,
    description,
    path: `/hotels/${hotel.slug}`,
    image: hotel.images[0],
    imageAlt: `${hotel.name} — ${hotel.location}`,
    type: "product",
    tags: [hotel.tier, hotel.propertyType, hotel.destinationSlug],
  });
}

export default async function HotelDetailPage({ params }: Props) {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);
  if (!hotel) notFound();

  const moreHotels = (await getHotelsByDestination(hotel.destinationSlug)).filter((h) => h.slug !== slug);

  // Fetch gallery + per-room images from R2 in parallel; fall back to static data if empty
  const base = `hotels/${hotel.slug}`;
  const roomFolders = hotel.rooms.map((r) => r.folder ?? null);
  const [r2Gallery, ...r2RoomImages] = await Promise.all([
    listR2Images(`${base}/gallery/`),
    ...roomFolders.map((f) => (f ? listR2Images(`${base}/rooms/${f}/`) : Promise.resolve([]))),
  ]);

  const galleryUrls = r2Gallery.length > 0 ? r2Gallery : hotel.images;
  const galleryImages = galleryUrls.map((url, i) => ({ url, alt: `${hotel.name} photo ${i + 1}` }));

  // Map room index → R2 image list (falls back to [] → component uses room.image)
  const roomImagesMap: Record<number, string[]> = {};
  hotel.rooms.forEach((_, i) => {
    if (r2RoomImages[i]?.length) roomImagesMap[i] = r2RoomImages[i];
  });

  // Pre-compute display prices server-side so applyHotelMargin never ships to the client bundle
  const roomDisplayPrices: Record<string, { season: string; price: number }[] | null> = {};
  hotel.rooms.forEach((room) => {
    roomDisplayPrices[room.name] = room.prices
      ? room.prices.map((sp) => ({ season: sp.season, price: applyHotelMargin(sp.price) }))
      : null;
  });

  const schema = combineSchemas(
    hotelSchema(hotel),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Hotels", url: "/hotels" },
      { name: hotel.name, url: `/hotels/${hotel.slug}` },
    ])
  );

  return (
    <div className="pt-0 sm:pt-6 pb-24 sm:pb-8">
      <JsonLd data={schema} id={`hotel-${hotel.slug}-jsonld`} />
      <Container>
        {/* Breadcrumb */}
        <Breadcrumb
          items={[
            { label: "Hotels", href: "/hotels" },
            { label: hotel.name },
          ]}
        />

        {/* Gallery */}
        <div className="mt-1 sm:mt-5">
          <MosaicGallery images={galleryImages} tourName={hotel.name} />
        </div>

        {/* Title bar */}
        <div className="mt-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-[28px] sm:text-[34px] font-bold text-[var(--text-primary)] tracking-tight">
              {hotel.name}
            </h1>
            <p className="text-[14px] text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {hotel.location}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="inline-flex gap-0.5" aria-label={`${hotel.rating} out of 5`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <Icon
                    key={i}
                    name="star"
                    size="md"
                    weight={i < Math.round(hotel.rating) ? "fill" : "regular"}
                    color={i < Math.round(hotel.rating) ? "var(--primary-muted)" : "var(--border-default)"}
                  />
                ))}
              </span>
              <span className="text-[15px] font-semibold text-[var(--text-primary)]">{hotel.rating}</span>
              <span className="text-[14px] text-[var(--text-tertiary)]">{hotel.reviewCount} reviews</span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] bg-[var(--primary-light)] text-[var(--primary)] rounded-[var(--radius-full)]">
                Traverse Partner
              </span>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <HotelRoomProvider initialRoom={hotel.rooms[0]}>
        <div className="mt-8 lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">
          {/* Main content */}
          <div>
            {/* Host strip */}
            <div className="flex items-center justify-between py-6 border-y border-[var(--border-default)]">
              <div>
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">
                  {hotel.propertyType} · Entire property
                </p>
                <p className="text-[14px] text-[var(--text-secondary)] mt-0.5">Hosted by Traverse Pakistan</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center overflow-hidden">
                <Image src="/logo.svg" alt="Traverse Pakistan" width={40} height={40} />
              </div>
            </div>

            {/* Highlights */}
            <div className="py-6 space-y-5 border-b border-[var(--border-default)]">
              {hotel.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] flex items-center justify-center shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8">
                      {i === 0 && <><path d="M1 6l11-4 11 4v4l-11 4L1 10z" /><path d="M1 10v4l11 4 11-4v-4" /></>}
                      {i === 1 && <><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /></>}
                      {i === 2 && <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />}
                    </svg>
                  </div>
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed pt-2">{h}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="py-6 border-b border-[var(--border-default)]">
              <p className="text-[15px] text-[var(--text-secondary)] leading-[1.7]">{hotel.description}</p>
            </div>

            {/* Rooms — client component handles mobile tap-to-select + booking bar */}
            <HotelRoomsBookingClient hotel={hotel} roomImagesMap={roomImagesMap} />

            {/* Amenities */}
            <div className="py-8 border-b border-[var(--border-default)]" id="amenities">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">What this place offers</h2>
              <div className="grid grid-cols-2 gap-3">
                {hotel.amenities.map((a) => (
                  <div key={a} className="flex items-center gap-3 py-2 text-[14px] text-[var(--text-secondary)]">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {a}
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews */}
            {hotel.reviews.length > 0 && (
              <div className="py-8 border-b border-[var(--border-default)]" id="reviews">
                <div className="flex items-center gap-3 mb-6">
                  <Icon name="star" size="xl" weight="fill" color="var(--primary-muted)" />
                  <span className="text-2xl font-bold text-[var(--text-primary)]">{hotel.rating}</span>
                  <span className="text-[var(--text-tertiary)]">·</span>
                  <span className="text-[15px] text-[var(--text-secondary)]">{hotel.reviewCount} reviews</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {hotel.reviews.map((review, i) => (
                    <div key={i} className="p-5 bg-[var(--bg-subtle)] rounded-[var(--radius-md)]">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-deep)] flex items-center justify-center text-[var(--on-dark)] text-[13px] font-bold">
                          {review.initial}
                        </div>
                        <div>
                          <p className="text-[14px] font-semibold text-[var(--text-primary)]">{review.name}</p>
                          <p className="text-[12px] text-[var(--text-tertiary)]">{review.date}</p>
                        </div>
                      </div>
                      <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">{review.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Policies */}
            <div className="py-8" id="policies">
              <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Things to know</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3">Hotel rules</h3>
                  <ul className="space-y-2">
                    {hotel.policies.rules.map((r, i) => (
                      <li key={i} className="text-[13px] text-[var(--text-secondary)]">{r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3">Safety & access</h3>
                  <ul className="space-y-2">
                    {hotel.policies.safety.map((s, i) => (
                      <li key={i} className="text-[13px] text-[var(--text-secondary)]">{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3">Cancellation policy</h3>
                  <ul className="space-y-2">
                    {hotel.policies.cancellation.map((c, i) => (
                      <li key={i} className="text-[13px] text-[var(--text-secondary)]">{c}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Tax note */}
              {hotel.taxNote && (
                <div className="mt-8 flex items-start gap-3 px-4 py-3 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-sm)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2" className="shrink-0 mt-0.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <p className="text-[13px] text-[var(--text-secondary)]">{hotel.taxNote}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar — Booking Card */}
          <aside className="hidden lg:block">
            <HotelBookingSidebar hotel={hotel} />
          </aside>
        </div>
        </HotelRoomProvider>

        {/* More hotels */}
        {moreHotels.length > 0 && (
          <section className="mt-16 pt-10 border-t border-[var(--border-default)]">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-8">
              More hotels in {hotel.destinationSlug.replace(/-/g, " ")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {moreHotels.map((h) => (
                <Link
                  key={h.id}
                  href={`/hotels/${h.slug}`}
                  className="group rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-primary)] border border-[var(--border-default)] hover:shadow-[var(--shadow-md)] transition-all duration-300"
                >
                  <div className="relative aspect-[3/2] overflow-hidden">
                    <Image src={h.image} alt={h.name} fill className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" sizes="300px" />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{h.name}</h3>
                      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-[var(--text-primary)]">
                        <Icon name="star" size="sm" weight="fill" color="var(--primary-muted)" />
                        {h.rating}
                      </span>
                    </div>
                    <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{h.location}</p>
                    <p className="text-[15px] font-bold text-[var(--text-primary)] mt-2 tabular-nums">
                      {formatPrice(h.pricePerNight)} <span className="text-[12px] font-normal text-[var(--text-tertiary)]">/ night</span>
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

      </Container>
    </div>
  );
}
