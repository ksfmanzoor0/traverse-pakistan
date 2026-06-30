import { SITE_CONFIG } from "@/lib/constants";

export const IS_GITHUB_PAGES = process.env.GITHUB_PAGES === "true";

/**
 * Canonical site URL — used in JSON-LD, sitemap, canonical tags, OG URLs.
 *
 * Priority:
 *   1) NEXT_PUBLIC_SITE_URL (explicit override, e.g. internal test host)
 *   2) SITE_CONFIG.url (production default: https://traversepakistan.com)
 *
 * For GitHub Pages internal previews, set NEXT_PUBLIC_SITE_URL to the preview
 * URL (e.g. https://akifhazarvi.github.io/traverse-pakistan) so canonical and
 * sitemap URLs point at the actual deployed location — though the site is
 * also noindex'd in that mode, so canonicals don't need to resolve publicly.
 */
function normalizeSiteUrl(raw: string | undefined): string {
  if (!raw) return SITE_CONFIG.url;
  const trimmed = raw.trim().replace(/\/+$/, "");
  // Accept hostnames without scheme — common Vercel env-var input.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

/** Path prefix under which the app is hosted (GitHub Pages subfolder). */
export const BASE_PATH = IS_GITHUB_PAGES
  ? process.env.GITHUB_PAGES_BASE_PATH ?? "/traverse-pakistan"
  : "";

export const SITE = {
  ...SITE_CONFIG,
  url: SITE_URL,
  basePath: BASE_PATH,
  logo: `${SITE_URL}${BASE_PATH}/logo.png`,
  logoWhite: `${SITE_URL}${BASE_PATH}/logo-white.png`,
  ogImage: `${SITE_URL}${BASE_PATH}/og-default.jpg`,
  locale: "en_US",
  country: "PK",
  addressLocality: "Islamabad",
  addressRegion: "Islamabad Capital Territory",
  postalCode: "44000",
  streetAddress: "Office #6, Plot No. 1, MPCHS E-11/1",
  geo: {
    latitude: 33.6938,
    longitude: 72.9715,
  },
  sameAs: [
    SITE_CONFIG.social.instagram,
    SITE_CONFIG.social.facebook,
    "https://tripadvisor.com/Attraction_Review-Traverse-Pakistan",
    "https://www.youtube.com/@traversepakistan",
  ],
  awards: [
    "TripAdvisor Travelers' Choice 2025",
    "#1 Top Rated Tour Agency in Islamabad",
  ],
} as const;

export function absoluteUrl(path: string): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${BASE_PATH}${clean}`;
}
