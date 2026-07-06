import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { plusJakartaSans } from "@/styles/fonts";
import { Providers } from "@/components/providers/Providers";
import { NavbarWrapper } from "@/components/layout/NavbarWrapper";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFAB } from "@/components/layout/WhatsAppFAB";
import { AwardStrip } from "@/components/layout/AwardStrip";
import { RouteProgress } from "@/components/ui/RouteProgress";
import { JsonLd } from "@/components/seo/JsonLd";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import {
  organizationSchema,
  websiteSchema,
  combineSchemas,
} from "@/lib/seo/schema";
import { SITE, IS_GITHUB_PAGES } from "@/lib/seo/site";
import { SUPABASE_URL, isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Traverse Pakistan — Pakistan's Highest-Rated Tourism Company",
    template: "%s | Traverse Pakistan",
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "Travel",
  keywords: [
    "Pakistan tours",
    "Hunza tour",
    "Skardu tour",
    "Pakistan travel",
    "Pakistan tour packages",
    "K2 Base Camp trek",
    "Fairy Meadows",
    "Karakoram Highway",
    "Gilgit-Baltistan tours",
    "Chitral Kalash tour",
    "Pakistan honeymoon",
    "cherry blossom Hunza",
    "Traverse Pakistan",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: SITE.locale,
    siteName: SITE.name,
    title: "Traverse Pakistan — Pakistan's Highest-Rated Tourism Company",
    description: SITE.description,
    url: SITE.url,
    images: [
      {
        url: SITE.ogImage,
        width: 1200,
        height: 630,
        alt: `${SITE.name} — tours across Hunza, Skardu, and Chitral`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Traverse Pakistan — Pakistan's Highest-Rated Tourism Company",
    description: SITE.description,
    images: [SITE.ogImage],
    creator: "@traversepakistan",
    site: "@traversepakistan",
  },
  // Icons auto-detected from src/app/icon.png and src/app/apple-icon.png —
  // Next.js generates the <link> tags at all requested sizes. Overriding
  // here would take precedence over the file-based icons, so we don't.
  manifest: "/site.webmanifest",
  robots: IS_GITHUB_PAGES
    ? {
        // Internal GitHub Pages previews are not public — noindex everything.
        index: false,
        follow: false,
        nocache: true,
        googleBot: { index: false, follow: false, noimageindex: true },
      }
    : {
        index: true,
        follow: true,
        nocache: false,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || "",
    },
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0D1B19" },
  ],
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rootSchema = combineSchemas(organizationSchema(), websiteSchema());

  return (
    <html
      lang="en"
      className={plusJakartaSans.variable}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Runs before React hydration — prevents dark-mode flash */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('tp-theme');if(t){document.documentElement.setAttribute('data-theme',t)}else{document.documentElement.setAttribute('data-theme','light')}}catch(e){document.documentElement.setAttribute('data-theme','light')}})();`,
          }}
        />
        <link rel="preconnect" href="https://traversepakistan.com" />
        <link rel="dns-prefetch" href="https://traversepakistan.com" />
        {/* Desktop-only preconnect for the hero LCP image chain.
            HeroSection is hidden on mobile so these hosts are not needed for
            first paint on mobile — the media query keeps mobile bytes flat
            while saving ~100-200ms on desktop LCP. */}
        <link rel="preconnect" href="https://ik.imagekit.io" crossOrigin="anonymous" media="(min-width: 768px)" />
        <link rel="preconnect" href="https://media.traversepakistan.com" crossOrigin="anonymous" media="(min-width: 768px)" />
        {isSupabaseConfigured && (
          <>
            <link rel="preconnect" href={SUPABASE_URL} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={SUPABASE_URL} />
          </>
        )}
      </head>
      <body className="min-h-screen flex flex-col antialiased">
        <JsonLd data={rootSchema} id="root-jsonld" />
        <Suspense fallback={null}>
          <RouteProgress />
        </Suspense>
        <Providers>
          <AwardStrip />
          <Suspense fallback={null}>
            <NavbarWrapper />
          </Suspense>
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppFAB />
        </Providers>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
