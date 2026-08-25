import type { MetadataRoute } from "next";
import { SITE, IS_GITHUB_PAGES, absoluteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

// Non-production Vercel deploys (Preview / Development) must never be indexed.
// The Preview env alone spans sandbox.traversepakistan.com + every ephemeral
// traverse-pakistan-*.vercel.app hostname; letting them index dilutes prod
// authority and pollutes the SERP with staging content.
const IS_NON_PRODUCTION_DEPLOY =
  !!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production";

// AI citation crawlers — these ones fetch a page when their model is answering
// a live user query and, when they cite, they link back. Referral traffic is
// small but engaged (chatgpt.com already lands 79 sessions / 53% engagement).
// Allowed for reads; blocked from the funnel like every other search engine.
const AI_CITATION_CRAWLERS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Google-Extended",
  "Applebot-Extended",
];

// Bulk-training scrapers — no reciprocal traffic, take the itinerary content
// wholesale to train a model that never cites back. Kept blocked.
const AI_TRAINING_CRAWLERS = [
  "GPTBot",
  "Claude-Web",
  "anthropic-ai",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "DiffBot",
  "FacebookBot",
  "Meta-ExternalAgent",
  "MistralAI-User",
];

const SEARCH_ENGINES = ["Googlebot", "Googlebot-Image", "Bingbot", "DuckDuckBot", "YandexBot", "Applebot"];

// /checkout paths deliberately stay ALLOWED (removed from this list) — the
// pages themselves export noindex metadata (verified in each checkout
// page.tsx). Blocking them via robots.txt would prevent Googlebot from
// crawling → prevent it from ever SEEING the noindex tag → left URLs stuck
// in the "Indexed, though blocked by robots.txt" bucket (we had 17). Letting
// Google crawl once so it can read the noindex is the cleaner signal.
//
// Same reasoning for /auth/*: pages export robots.index=false. Nofollow on
// internal links reduces discovery; noindex handles anything that leaks in.
const FUNNEL_DISALLOW = [
  "/account/",
  "/booking/",
  "/api/",
  "/_next/",
];

/**
 * Dynamic robots.txt.
 *
 * - Vercel production: search engines + AI citation crawlers allowed with
 *   explicit funnel disallows; bulk-training AI crawlers denied. Sitemap
 *   advertised.
 * - Vercel Preview / Development (VERCEL_ENV != "production"): everything
 *   disallowed — sandbox.traversepakistan.com and every preview.vercel.app
 *   host must never be indexed.
 * - GitHub Pages (GITHUB_PAGES=true): everything disallowed — internal test
 *   previews must never be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  if (IS_GITHUB_PAGES || IS_NON_PRODUCTION_DEPLOY) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
      host: SITE.url,
    };
  }

  const searchEngineRules = SEARCH_ENGINES.map((userAgent) => ({
    userAgent,
    allow: "/",
    disallow: FUNNEL_DISALLOW,
  }));

  const aiCitationRules = AI_CITATION_CRAWLERS.map((userAgent) => ({
    userAgent,
    allow: "/",
    disallow: FUNNEL_DISALLOW,
  }));

  const aiTrainingRules = AI_TRAINING_CRAWLERS.map((userAgent) => ({
    userAgent,
    disallow: "/",
  }));

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: FUNNEL_DISALLOW },
      ...searchEngineRules,
      ...aiCitationRules,
      ...aiTrainingRules,
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
