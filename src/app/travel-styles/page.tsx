import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { buildMetadata } from "@/lib/seo/metadata";
import { travelStyles } from "@/data/travel-styles";
import { JsonLd } from "@/components/seo/JsonLd";
import { breadcrumbSchema, itemListSchema, combineSchemas } from "@/lib/seo/schema";

export const metadata: Metadata = buildMetadata({
  title: "Travel Styles — Trekking, Family, Honeymoon, Solo, Cultural Tours",
  description:
    "Browse Pakistan tours by travel style: trekking, family, honeymoon, solo, culture, or coastal. Find the trip that matches your pace.",
  path: "/travel-styles",
  tags: ["Pakistan honeymoon tour", "trekking Pakistan", "family tour Pakistan", "solo travel Pakistan"],
});

export default function TravelStylesPage() {
  const schema = combineSchemas(
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Travel Styles", url: "/travel-styles" },
    ]),
    itemListSchema({
      name: "Pakistan Tours by Travel Style",
      path: "/travel-styles",
      items: travelStyles.map((i) => ({ name: i.name, path: `/travel-styles/${i.slug}` })),
    })
  );

  return (
    <div className="py-8 sm:py-12">
      <JsonLd data={schema} id="travel-styles-jsonld" />
      <Container>
        <Breadcrumb items={[{ label: "Travel Styles" }]} />
        <div className="mt-6 mb-10">
          <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight">
            Pakistan Tours by Travel Style
          </h1>
          <p className="text-lg text-[var(--text-tertiary)] mt-2 max-w-xl">
            Choose a travel style that matches your vibe
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {travelStyles.map((style) => (
            <Link
              key={style.id}
              href={`/travel-styles/${style.slug}`}
              className="group relative rounded-xl overflow-hidden h-[300px] flex flex-col justify-end"
            >
              <Image
                src={style.image}
                alt={style.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="relative p-6">
                <h2 className="text-2xl font-bold text-[var(--on-dark)]">{style.name}</h2>
                <p className="text-[14px] text-[var(--on-dark-secondary)] mt-1">{style.tourCount} tours</p>
                <p className="text-[14px] text-[var(--on-dark-secondary)] mt-2 line-clamp-2">{style.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
