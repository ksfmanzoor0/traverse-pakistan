import type { MetadataRoute } from "next";
import { SITE, IS_GITHUB_PAGES, absoluteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";

// AI crawlers: block by default so LLMs can't scrape structured itineraries,
// pricing, and hotel configurations to answer user queries natively without a
// visit. Flip to allow if the referral traffic outweighs the scraping loss.
const AI_CRAWLERS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
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

// Explicit prefixes beat raw /*/ wildcards — many crawlers parse `/*/checkout`
// as a literal path instead of a pattern, so we list the checkout routes by
// product prefix.
const FUNNEL_DISALLOW = [
  "/account/",
  "/booking/",
  "/packages/*/checkout",
  "/packages/*/checkout/",
  "/hotels/*/checkout",
  "/hotels/*/checkout/",
  "/grouptours/*/checkout",
  "/grouptours/*/checkout/",
  "/api/",
  "/_next/",
];

/**
 * Dynamic robots.txt.
 *
 * - Vercel (default build): search engines allowed with explicit funnel
 *   disallows; AI crawlers explicitly denied. Sitemap advertised.
 * - GitHub Pages (GITHUB_PAGES=true): everything disallowed — internal test
 *   previews must never be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  if (IS_GITHUB_PAGES) {
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

  const aiCrawlerRules = AI_CRAWLERS.map((userAgent) => ({
    userAgent,
    disallow: "/",
  }));

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: FUNNEL_DISALLOW },
      ...searchEngineRules,
      ...aiCrawlerRules,
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE.url,
  };
}
