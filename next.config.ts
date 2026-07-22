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

        // Other WP plugin slugs — no 1:1 mapping to current slugs, so route each
        // family to its category landing page. 301s pass ~90% of the backlink
        // equity Google was still crediting to the dead URLs.
        { source: "/st_hotel/:slug*", destination: "/hotels", permanent: true },
        { source: "/st_activity/:slug*", destination: "/grouptours", permanent: true },
        { source: "/st_location/:slug*", destination: "/destinations", permanent: true },
        { source: "/st_room/:slug*", destination: "/hotels", permanent: true },

        // Singular WP taxonomy paths shared with any old third-party listings.
        { source: "/tour/:slug*", destination: "/grouptours", permanent: true },
        { source: "/hotel/:slug*", destination: "/hotels", permanent: true },
        { source: "/destination/:slug*", destination: "/destinations", permanent: true },
        { source: "/package/:slug*", destination: "/packages", permanent: true },

        // WP blog taxonomy pages.
        { source: "/category/:slug*", destination: "/blog", permanent: true },
        { source: "/tag/:slug*", destination: "/blog", permanent: true },

        // WP date-archived blog posts: /YYYY/MM/slug → /blog
        {
          source: "/:yyyy(2\\d{3})/:mm(\\d{2})/:slug*",
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
