/**
 * Schema.org JSON-LD builders.
 *
 * Returns plain objects — render via <JsonLd> component.
 * All URLs should be absolute. Use absoluteUrl() helper.
 *
 * References:
 *   https://schema.org/TravelAgency
 *   https://schema.org/TouristTrip
 *   https://schema.org/Hotel
 *   https://schema.org/TouristDestination
 *   https://schema.org/FAQPage
 *   https://schema.org/Article
 *   https://schema.org/BreadcrumbList
 *   https://developers.google.com/search/docs/appearance/structured-data
 */
import type { Tour } from "@/types/tour";
import type { Hotel, HotelReview } from "@/types/hotel";
import type { Destination } from "@/types/destination";
import type { Region } from "@/types/region";
import type { BlogPost } from "@/types/blog";
import type { FAQ } from "@/types/faq";
import type { Package } from "@/types/package";

import { SITE, absoluteUrl } from "./site";

type SchemaNode = Record<string, unknown>;

const CURRENCY_PKR = "PKR";

function imageUrl(src: string | undefined | null): string | undefined {
  if (!src) return undefined;
  return src.startsWith("http") ? src : absoluteUrl(src);
}

function trimText(text: string, max = 5000): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

// Parse a date string like "March 2026" or ISO into YYYY-MM-DD.
function normalizeDate(input: string): string {
  const iso = new Date(input);
  if (!Number.isNaN(iso.getTime())) return iso.toISOString().slice(0, 10);
  return input;
}

// ── Organization / LocalBusiness / WebSite ──

export function organizationSchema(): SchemaNode {
  return {
    "@context": "https://schema.org",
    "@type": ["Organization", "TravelAgency", "LocalBusiness"],
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    alternateName: ["Traverse PK"],
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      "@id": `${SITE.url}/#logo`,
      url: SITE.logo,
      width: 512,
      height: 512,
      caption: SITE.name,
    },
    image: SITE.ogImage,
    description: SITE.description,
    slogan: SITE.tagline,
    telephone: SITE.phone,
    email: SITE.email,
    priceRange: "PKR 40,000 – PKR 500,000",
    currenciesAccepted: "PKR, USD",
    paymentAccepted: "Cash, Bank Transfer, Credit Card",
    address: {
      "@type": "PostalAddress",
      streetAddress: SITE.streetAddress,
      addressLocality: SITE.addressLocality,
      addressRegion: SITE.addressRegion,
      postalCode: SITE.postalCode,
      addressCountry: SITE.country,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: SITE.geo.latitude,
      longitude: SITE.geo.longitude,
    },
    areaServed: {
      "@type": "Country",
      name: "Pakistan",
    },
    knowsAbout: [
      "Pakistan tourism",
      "Hunza tours",
      "Skardu tours",
      "K2 Base Camp trek",
      "Karakoram Highway",
      "Fairy Meadows",
      "Nanga Parbat",
      "Kalash Valley",
      "Deosai Plateau",
      "Trekking in Pakistan",
    ],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: SITE.stats.rating,
      reviewCount: SITE.stats.reviewCount,
      bestRating: 5,
      worstRating: 1,
    },
    award: [...SITE.awards],
    sameAs: [...SITE.sameAs],
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "09:00",
        closes: "19:00",
      },
    ],
    contactPoint: [
      {
        "@type": "ContactPoint",
        telephone: SITE.phone,
        contactType: "customer service",
        availableLanguage: ["English", "Urdu"],
        areaServed: "PK",
      },
      {
        "@type": "ContactPoint",
        telephone: `+${SITE.whatsapp}`,
        contactType: "reservations",
        contactOption: "HearingImpairedSupported",
        availableLanguage: ["English", "Urdu"],
        areaServed: "PK",
      },
    ],
  };
}

export function websiteSchema(): SchemaNode {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: "en-US",
    publisher: { "@id": `${SITE.url}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE.url}/grouptours?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

// ── BreadcrumbList ──

export interface BreadcrumbItem {
  name: string;
  url: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]): SchemaNode {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : absoluteUrl(item.url),
    })),
  };
}

// ── TouristTrip (group tour) ──

const CITY_LABEL: Record<"ISB" | "LHE" | "KHI" | "KDU" | "KDU", string> = {
  ISB: "Islamabad", LHE: "Lahore", KHI: "Karachi", KDU: "Skardu",
};

// If we have statically-computable per-city addon totals, emit an
// AggregateOffer with lowPrice/highPrice + one Offer per city so Google can
// display the price range on rich results. Otherwise fall back to a single
// Offer at the ground base — the scraper-driven flight cost would go stale
// and read as a price mismatch to visitors.
function buildTourOffers(tour: Tour, url: string): SchemaNode {
  const base = tour.pricing.base;
  const validFrom = new Date().toISOString().slice(0, 10);
  const perCity: Partial<Record<"ISB" | "LHE" | "KHI" | "KDU", number>> = tour.addonCostByCity ?? {};
  const cityTotals: Array<{ city: "ISB" | "LHE" | "KHI" | "KDU"; total: number }> = [];

  // Anchor city pays exactly base with no addon.
  if (tour.anchorCity) cityTotals.push({ city: tour.anchorCity, total: base });

  for (const c of ["ISB", "LHE", "KHI", "KDU"] as const) {
    if (tour.anchorCity === c) continue;
    const cost = perCity[c];
    if (typeof cost === "number") cityTotals.push({ city: c, total: base + cost });
  }

  if (cityTotals.length < 2) {
    return {
      "@type": "Offer",
      url,
      price: base,
      priceCurrency: CURRENCY_PKR,
      availability: "https://schema.org/InStock",
      validFrom,
      priceValidUntil: "2027-12-31",
      seller: { "@id": `${SITE.url}/#organization` },
    };
  }

  const prices = cityTotals.map((c) => c.total);
  return {
    "@type": "AggregateOffer",
    url,
    priceCurrency: CURRENCY_PKR,
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: cityTotals.length,
    availability: "https://schema.org/InStock",
    seller: { "@id": `${SITE.url}/#organization` },
    offers: cityTotals.map((c) => ({
      "@type": "Offer",
      name: `${CITY_LABEL[c.city]} departure`,
      price: c.total,
      priceCurrency: CURRENCY_PKR,
      availability: "https://schema.org/InStock",
      validFrom,
      priceValidUntil: "2027-12-31",
      seller: { "@id": `${SITE.url}/#organization` },
    })),
  };
}

export function tourSchema(tour: Tour): SchemaNode {
  const url = absoluteUrl(`/grouptours/${tour.slug}`);
  const images = tour.images
    .slice(0, 8)
    .map((img) => imageUrl(img.url))
    .filter(Boolean) as string[];

  return {
    "@context": "https://schema.org",
    "@type": ["TouristTrip", "Product"],
    "@id": `${url}#trip`,
    name: tour.name,
    description: tour.description,
    url,
    image: images,
    touristType: tour.travelStyleSlugs,
    itinerary: {
      "@type": "ItemList",
      numberOfItems: tour.highlights.length,
      itemListElement: tour.highlights.map((h, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: h,
      })),
    },
    provider: { "@id": `${SITE.url}/#organization` },
    offers: buildTourOffers(tour, url),
    aggregateRating:
      tour.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: tour.rating,
            reviewCount: tour.reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    subjectOf: {
      "@type": "CreativeWork",
      about: tour.route,
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Duration (days)",
        value: tour.duration,
      },
      {
        "@type": "PropertyValue",
        name: "Max group size",
        value: tour.maxGroupSize,
      },
      {
        "@type": "PropertyValue",
        name: "Languages",
        value: tour.languages.join(", "),
      },
      {
        "@type": "PropertyValue",
        name: "Free cancellation",
        value: tour.freeCancellation ? "Yes" : "No",
      },
    ],
  };
}

// ── Package (custom-date) ──

export function packageSchema(pkg: Package): SchemaNode {
  const url = absoluteUrl(`/packages/${pkg.slug}`);
  const images = pkg.images
    .slice(0, 8)
    .map((img) => imageUrl(img.url))
    .filter(Boolean) as string[];

  // Min/max across all non-null tier × departure-city cells so packages with
  // KHI/LHE-only pricing (e.g. Makran, Sindh) show the correct range.
  const priceCells: number[] = [];
  for (const tier of [pkg.tiers.deluxe, pkg.tiers.luxury]) {
    for (const city of ["islamabad", "lahore", "karachi"] as const) {
      const p = tier[city];
      if (typeof p === "number" && p > 0) priceCells.push(p);
    }
  }
  const lowPrice = priceCells.length ? Math.min(...priceCells) : undefined;
  const highPrice = priceCells.length ? Math.max(...priceCells) : undefined;

  const tierOffers: SchemaNode[] = [];
  for (const [tierName, tier] of [
    ["Deluxe", pkg.tiers.deluxe],
    ["Luxury", pkg.tiers.luxury],
  ] as const) {
    for (const [cityKey, cityLabel] of [
      ["islamabad", "Islamabad"],
      ["lahore", "Lahore"],
      ["karachi", "Karachi"],
    ] as const) {
      const price = tier[cityKey];
      if (typeof price !== "number" || price <= 0) continue;
      tierOffers.push({
        "@type": "Offer",
        name: `${tierName} tier — ${cityLabel} departure`,
        price,
        priceCurrency: CURRENCY_PKR,
        availability: "https://schema.org/InStock",
        url,
      });
    }
  }

  return {
    "@context": "https://schema.org",
    "@type": ["TouristTrip", "Product"],
    "@id": `${url}#trip`,
    name: pkg.name,
    description: pkg.description,
    url,
    image: images,
    provider: { "@id": `${SITE.url}/#organization` },
    offers: {
      "@type": "AggregateOffer",
      url,
      priceCurrency: CURRENCY_PKR,
      lowPrice,
      highPrice,
      offerCount: tierOffers.length,
      offers: tierOffers,
    },
    aggregateRating:
      pkg.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: pkg.rating,
            reviewCount: pkg.reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    additionalProperty: [
      { "@type": "PropertyValue", name: "Duration (days)", value: pkg.duration },
      { "@type": "PropertyValue", name: "Max group size", value: pkg.maxGroupSize },
      { "@type": "PropertyValue", name: "Languages", value: pkg.languages.join(", ") },
    ],
  };
}

// ── Hotel ──

function hotelReviewSchema(review: HotelReview): SchemaNode {
  return {
    "@type": "Review",
    author: {
      "@type": "Person",
      name: review.name,
    },
    datePublished: normalizeDate(review.date),
    reviewBody: review.text,
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: 5,
      worstRating: 1,
    },
  };
}

export function hotelSchema(hotel: Hotel, regionName?: string): SchemaNode {
  const url = absoluteUrl(`/hotels/${hotel.slug}`);
  const images = hotel.images.slice(0, 8).map((i) => imageUrl(i)).filter(Boolean) as string[];

  return {
    "@context": "https://schema.org",
    "@type": ["Hotel", "LodgingBusiness"],
    "@id": `${url}#hotel`,
    name: hotel.name,
    description: hotel.description,
    url,
    image: images,
    priceRange: `PKR ${hotel.pricePerNight.toLocaleString()} – PKR ${(hotel.pricePerNight * 2.5).toLocaleString()} / night`,
    starRating: {
      "@type": "Rating",
      ratingValue: hotel.tier === "luxury" ? 5 : hotel.tier === "premium" ? 4 : hotel.tier === "deluxe" ? 3 : 3,
    },
    amenityFeature: hotel.amenities.map((a) => ({
      "@type": "LocationFeatureSpecification",
      name: a,
      value: true,
    })),
    checkinTime: hotel.checkIn,
    checkoutTime: hotel.checkOut,
    address: {
      "@type": "PostalAddress",
      addressLocality: hotel.location.split(",")[0]?.trim(),
      ...(regionName ? { addressRegion: regionName } : {}),
      addressCountry: SITE.country,
    },
    containsPlace: hotel.rooms.map((r) => ({
      "@type": "HotelRoom",
      name: r.name,
      description: r.beds,
      bed: r.beds,
      image: imageUrl(r.image),
      offers: {
        "@type": "Offer",
        price: r.price,
        priceCurrency: CURRENCY_PKR,
        availability:
          r.available > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
      },
    })),
    makesOffer: {
      "@type": "Offer",
      priceSpecification: {
        "@type": "PriceSpecification",
        price: hotel.pricePerNight,
        priceCurrency: CURRENCY_PKR,
      },
      availability: "https://schema.org/InStock",
      seller: { "@id": `${SITE.url}/#organization` },
    },
    aggregateRating:
      hotel.reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: hotel.rating,
            reviewCount: hotel.reviewCount,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    review: hotel.reviews.map(hotelReviewSchema),
  };
}

// ── Destination / Region ──

export function destinationSchema(dest: Destination): SchemaNode {
  const url = absoluteUrl(`/destinations/${dest.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    "@id": `${url}#destination`,
    name: dest.name,
    description: dest.description,
    url,
    image: imageUrl(dest.heroImage),
    touristType: "Adventure, Cultural, Family, Solo",
    includesAttraction: dest.whyVisitCards.map((c) => ({
      "@type": "TouristAttraction",
      name: c.title,
      description: c.description,
    })),
    subjectOf: dest.seasons.map((s) => ({
      "@type": "CreativeWork",
      name: `${dest.name} in ${s.season}`,
      about: s.description,
    })),
    containedInPlace: {
      "@type": "Country",
      name: "Pakistan",
    },
  };
}

export function regionSchema(region: Region): SchemaNode {
  const url = absoluteUrl(`/regions/${region.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": ["TouristDestination", "Place"],
    "@id": `${url}#region`,
    name: region.name,
    description: region.description,
    url,
    image: imageUrl(region.heroImage),
    containedInPlace: {
      "@type": "Country",
      name: "Pakistan",
    },
  };
}

// ── Blog / Article ──

export function articleSchema(post: BlogPost, updatedAt?: string): SchemaNode {
  const url = absoluteUrl(`/blog/${post.slug}`);
  const wordCount = post.content.split(/\s+/).length;
  return {
    "@context": "https://schema.org",
    "@type": ["BlogPosting", "Article"],
    "@id": `${url}#article`,
    headline: post.title,
    description: post.excerpt || post.metaDescription,
    url,
    image: imageUrl(post.image),
    datePublished: post.publishedAt,
    dateModified: updatedAt || post.publishedAt,
    wordCount,
    timeRequired: post.readTime,
    keywords: post.tags.join(", "),
    articleSection: post.tag,
    inLanguage: "en-US",
    author: {
      "@type": "Person",
      name: post.author,
      url: `${SITE.url}/about`,
    },
    publisher: { "@id": `${SITE.url}/#organization` },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    about: post.destinationSlug
      ? { "@type": "TouristDestination", name: post.destinationSlug }
      : undefined,
  };
}

// ── FAQPage ──

export function faqPageSchema(faqs: FAQ[]): SchemaNode {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: trimText(faq.answer, 2000),
      },
    })),
  };
}

// ── Group combinator ──

export function combineSchemas(...schemas: (SchemaNode | null | undefined | false)[]): SchemaNode {
  return {
    "@context": "https://schema.org",
    "@graph": schemas.filter(Boolean) as SchemaNode[],
  };
}
