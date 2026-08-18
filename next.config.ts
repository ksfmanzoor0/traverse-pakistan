import type { NextConfig } from "next";

/**
 * Dual-target build:
 *   - Default  → Vercel / any Node host. Image optimization, security headers,
 *     sitemap revalidation, everything the SEO audit recommends.
 *   - GITHUB_PAGES=true → static export for GitHub Pages (internal testing only).
 *     Ships to `<user>.github.io/traverse-pakistan/` with unoptimized images,
 *     no runtime headers, and site-wide noindex via <meta> in the layout.
 */
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const repoBasePath = process.env.GITHUB_PAGES_BASE_PATH ?? "/traverse-pakistan";

const nextConfig: NextConfig = {

  ...(isGitHubPages && {
    output: "export",
    basePath: repoBasePath,
    assetPrefix: repoBasePath,
    trailingSlash: true,
  }),
  images: {
    loader: isGitHubPages ? "default" : "custom",
    loaderFile: isGitHubPages ? undefined : "./src/lib/imageLoader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.traversepakistan.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/traversepakistan/**",
      },
      {
        protocol: "https",
        hostname: "traversepakistan.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "www.traversepakistan.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        // WordPress moved to wp.traversepakistan.com so the apex can point at
        // Vercel. Blog images + a handful of legacy static-data hero shots
        // (travel-styles, about) still fetch from here.
        protocol: "https",
        hostname: "wp.traversepakistan.com",
        pathname: "/wp-content/uploads/**",
      },
      {
        protocol: "https",
        hostname: "img.youtube.com",
        pathname: "/vi/**",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
    ],
    // GitHub Pages: fall back to unoptimized (no Node runtime)
    unoptimized: isGitHubPages,
  },
  // redirects() preserves SEO from the old WordPress URL structure.
  // WP plugin slug `/st_tour/{slug}/` → new `/grouptours/{slug}`.
  ...(!isGitHubPages && {
    async redirects() {
      return [
        // Original WP plugin (Support Tour): /st_tour/{slug} → /grouptours/{slug}
        { source: "/st_tour/:slug", destination: "/grouptours/:slug", permanent: true },
        { source: "/st_tour/:slug/", destination: "/grouptours/:slug", permanent: true },
        // /st_tour/{slug}/feed/ → /grouptours/{slug} (drop the RSS suffix)
        { source: "/st_tour/:slug/feed", destination: "/grouptours/:slug", permanent: true },
        { source: "/st_tour/:slug/feed/", destination: "/grouptours/:slug", permanent: true },

        // Other WP plugin slugs — no 1:1 mapping to current slugs, so route each
        // family to its category landing page. 301s pass ~90% of the backlink
        // equity Google was still crediting to the dead URLs.
        { source: "/st_hotel/:slug*", destination: "/hotels", permanent: true },
        { source: "/st_activity/:slug*", destination: "/grouptours", permanent: true },
        // /st_location/* is handled by middleware.ts — it looks up the slug
        // against the current destinations set and 301s to the specific page
        // when possible, else falls back to /destinations. Static redirect
        // would risk 301 → 404 because WP mis-tagged regions.
        { source: "/st_room/:slug*", destination: "/hotels", permanent: true },
        { source: "/st_packages/:slug*", destination: "/packages", permanent: true },
        // WP transport (cars): no equivalent on the new site — send home.
        { source: "/st_car/:slug*", destination: "/", permanent: true },
        // WP admin junk (email templates) — should never have been indexed.
        { source: "/st_template_email/:slug*", destination: "/", permanent: true },

        // Singular WP taxonomy paths shared with any old third-party listings.
        { source: "/tour/:slug*", destination: "/grouptours", permanent: true },
        { source: "/hotel/:slug*", destination: "/hotels", permanent: true },
        { source: "/destination/:slug*", destination: "/destinations", permanent: true },
        { source: "/package/:slug*", destination: "/packages", permanent: true },

        // WP blog taxonomy pages.
        { source: "/category/:slug*", destination: "/blog", permanent: true },
        { source: "/tag/:slug*", destination: "/blog", permanent: true },

        // WP hotel-room detail pages — no 1:1 mapping (rooms belong to hotels
        // on the new site, no standalone URLs). Send to /hotels listing.
        { source: "/hotel_room/:slug*", destination: "/hotels", permanent: true },

        // WooCommerce (WP product pages) — the old site sold trips + cars +
        // rooms as products. Most were trip-flavoured; safe fallback = /grouptours.
        // Product taxonomies + author + order pages have no equivalent → home.
        { source: "/product/:slug*", destination: "/grouptours", permanent: true },
        { source: "/product-tag/:slug*", destination: "/", permanent: true },
        { source: "/product-category/:slug*", destination: "/", permanent: true },
        { source: "/order-received/:slug*", destination: "/", permanent: true },
        { source: "/author/:slug*", destination: "/", permanent: true },

        // Old WP language variants (en/) — new site is English-only, drop prefix.
        // /en/blog/* → /blog listing (blog post slugs from WP don't match current
        // blog set, so we send to the listing rather than /). Order matters:
        // this must come BEFORE the /en/:path* catch-all.
        { source: "/en/blog/:slug*", destination: "/blog", permanent: true },
        { source: "/en", destination: "/", permanent: true },
        { source: "/en/:path*", destination: "/", permanent: true },

        // Misc WP legacy pages — /type/gallery, /feed suffixes on any path.
        { source: "/type/:path*", destination: "/", permanent: true },
        { source: "/feed", destination: "/", permanent: true },
        { source: "/feed/", destination: "/", permanent: true },
        { source: "/feed.xml", destination: "/", permanent: true },
        { source: "/:path*/feed", destination: "/:path*", permanent: true },
        { source: "/:path*/feed/", destination: "/:path*", permanent: true },

        // WP date-archived blog posts: /YYYY/MM/slug → /blog
        {
          source: "/:yyyy(2\\d{3})/:mm(\\d{2})/:slug*",
          destination: "/blog",
          permanent: true,
        },

        // WP root-level policy/section pages — renamed on the new site.
        { source: "/cancellation-policy-of-traverse-pakistan", destination: "/cancellation", permanent: true },
        { source: "/cancellation-policy-of-traverse-pakistan/", destination: "/cancellation", permanent: true },
        { source: "/customized-trips", destination: "/customise-tour", permanent: true },
        { source: "/customized-trips/", destination: "/customise-tour", permanent: true },
        { source: "/invitation-letter-for-pakistan", destination: "/invitation-letter", permanent: true },
        { source: "/invitation-letter-for-pakistan/", destination: "/invitation-letter", permanent: true },
        { source: "/privacy-policy", destination: "/privacy", permanent: true },
        { source: "/privacy-policy/", destination: "/privacy", permanent: true },
        { source: "/privacy-and-cookies", destination: "/privacy", permanent: true },
        { source: "/privacy-and-cookies/", destination: "/privacy", permanent: true },
        { source: "/all-destinations", destination: "/destinations", permanent: true },
        { source: "/all-destinations/", destination: "/destinations", permanent: true },
        { source: "/pakistan-tours", destination: "/packages", permanent: true },
        { source: "/pakistan-tours/", destination: "/packages", permanent: true },
        { source: "/experiences", destination: "/packages", permanent: true },
        { source: "/experiences/", destination: "/packages", permanent: true },
        { source: "/transport", destination: "/", permanent: true },
        { source: "/transport/", destination: "/", permanent: true },

        // WP root-level blog posts — new site nests them under /blog/{slug}.
        // Every slug in the 404 report matches a current blog post.
        { source: "/how-traverse-pakistan-is-different-than-a-trivial-tour-company", destination: "/blog/how-traverse-pakistan-is-different-than-a-trivial-tour-company", permanent: true },
        { source: "/how-traverse-pakistan-is-different-than-a-trivial-tour-company/", destination: "/blog/how-traverse-pakistan-is-different-than-a-trivial-tour-company", permanent: true },
        { source: "/trek-to-haramosh-massif-kutwal-lake", destination: "/blog/trek-to-haramosh-massif-kutwal-lake", permanent: true },
        { source: "/trek-to-haramosh-massif-kutwal-lake/", destination: "/blog/trek-to-haramosh-massif-kutwal-lake", permanent: true },
        { source: "/leos-workshop-explores-walled-city-of-lahore-2", destination: "/blog/leos-workshop-explores-walled-city-of-lahore-2", permanent: true },
        { source: "/leos-workshop-explores-walled-city-of-lahore-2/", destination: "/blog/leos-workshop-explores-walled-city-of-lahore-2", permanent: true },
        { source: "/all-about-the-killer-mountain-nanga-parbat", destination: "/blog/all-about-the-killer-mountain-nanga-parbat", permanent: true },
        { source: "/all-about-the-killer-mountain-nanga-parbat/", destination: "/blog/all-about-the-killer-mountain-nanga-parbat", permanent: true },
        { source: "/things-to-do-in-hunza-valley", destination: "/blog/things-to-do-in-hunza-valley", permanent: true },
        { source: "/things-to-do-in-hunza-valley/", destination: "/blog/things-to-do-in-hunza-valley", permanent: true },
        { source: "/who-are-kalasha-people-where-do-they-live", destination: "/blog/who-are-kalasha-people-where-do-they-live", permanent: true },
        { source: "/who-are-kalasha-people-where-do-they-live/", destination: "/blog/who-are-kalasha-people-where-do-they-live", permanent: true },
        { source: "/peaks-visible-from-hunza-valley", destination: "/blog/peaks-visible-from-hunza-valley", permanent: true },
        { source: "/peaks-visible-from-hunza-valley/", destination: "/blog/peaks-visible-from-hunza-valley", permanent: true },
        { source: "/best-places-to-experience-blossom-up-north", destination: "/blog/best-places-to-experience-blossom-up-north", permanent: true },
        { source: "/best-places-to-experience-blossom-up-north/", destination: "/blog/best-places-to-experience-blossom-up-north", permanent: true },
        { source: "/best-winter-destinations-of-pakistan", destination: "/blog/best-winter-destinations-of-pakistan", permanent: true },
        { source: "/best-winter-destinations-of-pakistan/", destination: "/blog/best-winter-destinations-of-pakistan", permanent: true },

        // WP default permalinks: /?p=NUMBER can't be mapped 1:1 without a WP
        // export. Best-effort — send to /blog listing (most were blog posts).
        {
          source: "/",
          has: [{ type: "query", key: "p" }],
          destination: "/blog",
          permanent: true,
        },
      ];
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "SAMEORIGIN" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=(self), interest-cohort=()",
            },
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
          ],
        },
        {
          source: "/robots.txt",
          headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" }],
        },
        {
          source: "/sitemap.xml",
          headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" }],
        },
        {
          source: "/llms.txt",
          headers: [{ key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400" }],
        },
      ];
    },
  }),
};

export default nextConfig;
