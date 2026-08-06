import type { Metadata } from "next";

import { SITE, absoluteUrl, IS_GITHUB_PAGES } from "./site";

interface PageMetaInput {
  title?: string;
  description?: string;
  path: string;
  image?: string | null;
  imageAlt?: string;
  type?: "website" | "article" | "product";
  publishedAt?: string;
  updatedAt?: string;
  authors?: string[];
  tags?: string[];
  noIndex?: boolean;
  ctr?: CtrEnhancements;
}

/**
 * CTR-driven title enhancements: appends " · 2026 · 4.9★" style suffix to the
 * base title so the SERP snippet signals freshness + social proof. Skipped
 * when a token is already present in the base (idempotent across rebuilds
 * and safe if the DB metaTitle already carries a year/rating).
 */
export interface CtrEnhancements {
  year?: number;   // e.g. 2026 → " · 2026"
  rating?: number; // e.g. 4.9  → " · 4.9★"
}

const BRAND_TAIL = ` | ${SITE.name}`;

// The root layout applies a "%s | Traverse Pakistan" title template.
// Some DB meta_title rows already end with " | Traverse Pakistan", which
// makes Next render the brand twice. Strip once here so the template can
// re-add it cleanly.
function stripBrandTail(title: string): string {
  return title.endsWith(BRAND_TAIL) ? title.slice(0, -BRAND_TAIL.length) : title;
}

export function polishTitleForCtr(title: string, e: CtrEnhancements | undefined): string {
  if (!e || (!e.year && !e.rating)) return title;
  const parts: string[] = [];
  if (e.year && !/\b(20\d{2})\b/.test(title)) parts.push(String(e.year));
  if (e.rating && !title.includes("★")) parts.push(`${e.rating.toFixed(1)}★`);
  if (!parts.length) return title;
  const polished = `${title} · ${parts.join(" · ")}`;
  // Template adds " | Traverse Pakistan" (~20 chars). Google truncates
  // around 60. Roll the polish back if it pushes the final over ~65.
  if (polished.length + BRAND_TAIL.length > 65) return title;
  return polished;
}

const OG_DEFAULTS = {
  width: 1200,
  height: 630,
  alt: SITE.name,
};

function absoluteImage(img: string | null | undefined): string {
  if (!img) return SITE.ogImage;
  if (img.startsWith("http")) return img;
  return absoluteUrl(img);
}

/**
 * Build Next.js Metadata with canonical, OpenGraph, and Twitter cards filled in.
 * Use this from every page's generateMetadata() / static metadata export.
 */
export function buildMetadata(input: PageMetaInput): Metadata {
  const {
    title: rawTitle,
    description,
    path,
    image,
    imageAlt,
    type = "website",
    publishedAt,
    updatedAt,
    authors,
    tags,
    noIndex,
    ctr,
  } = input;

  const title = rawTitle ? polishTitleForCtr(stripBrandTail(rawTitle), ctr) : rawTitle;
  const canonical = absoluteUrl(path);
  const ogImage = absoluteImage(image);
  const finalDescription = description || SITE.description;

  const metadata: Metadata = {
    title,
    description: finalDescription,
    alternates: {
      canonical,
      types: {
        "application/rss+xml": `${SITE.url}/feed.xml`,
      },
    },
    openGraph: {
      type: type === "product" ? "website" : type,
      locale: SITE.locale,
      siteName: SITE.name,
      title,
      description: finalDescription,
      url: canonical,
      images: [
        {
          url: ogImage,
          width: OG_DEFAULTS.width,
          height: OG_DEFAULTS.height,
          alt: imageAlt || title || OG_DEFAULTS.alt,
        },
      ],
      ...(type === "article" && {
        publishedTime: publishedAt,
        modifiedTime: updatedAt || publishedAt,
        authors,
        tags,
      }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: finalDescription,
      images: [ogImage],
      creator: "@traversepakistan",
      site: "@traversepakistan",
    },
    robots:
      noIndex || IS_GITHUB_PAGES
        ? {
            index: false,
            follow: false,
            nocache: true,
            googleBot: {
              index: false,
              follow: false,
              noimageindex: true,
            },
          }
        : {
            index: true,
            follow: true,
            googleBot: {
              index: true,
              follow: true,
              "max-video-preview": -1,
              "max-image-preview": "large",
              "max-snippet": -1,
            },
          },
    keywords: tags,
  };

  return metadata;
}
