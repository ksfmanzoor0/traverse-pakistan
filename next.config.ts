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
  // headers() is ignored under `output: export`, so skip it for GH Pages.
  ...(!isGitHubPages && {
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
