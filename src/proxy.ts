import { NextRequest, NextResponse } from "next/server";
import { resolveLegacyDestinationSlug } from "./lib/seo/legacy-destination-slugs";

const ALLOWED_ORIGINS = [
  "https://traversepakistan.com",
  "https://www.traversepakistan.com",
  "https://traverse-pakistan.vercel.app",
  "https://sandbox.traversepakistan.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

const VERCEL_PREVIEW_RE = /^https:\/\/traverse-pakistan-[a-z0-9]+-ksfmanzoor0s-projects\.vercel\.app$/;

// Two independent concerns share the proxy so we only pay one middleware pass:
//   1. CSRF + request-id injection on /api/*
//   2. Legacy WordPress /st_location/{region}/{slug}/ → /destinations/{slug}
//      redirect (needs slug lookup — can't be a static next.config redirect
//      because WP mis-tagged regions and used typo variants).
export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Legacy /st_location redirect ─────────────────────────────────────────
  if (pathname.startsWith("/st_location/")) {
    const segments = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    // segments[0] = "st_location"; ignore region(s) — last segment is the slug
    const rawSlug = segments[segments.length - 1] ?? "";
    const resolved = resolveLegacyDestinationSlug(rawSlug);
    const url = request.nextUrl.clone();
    url.pathname = resolved ? `/destinations/${resolved}` : "/destinations";
    url.search = "";
    return NextResponse.redirect(url, 301);
  }

  // ── CSRF + request-id on /api/* ──────────────────────────────────────────
  if (pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");

    if (origin && !ALLOWED_ORIGINS.includes(origin) && !VERCEL_PREVIEW_RE.test(origin)) {
      return new NextResponse(null, { status: 403 });
    }

    const headers = new Headers(request.headers);
    headers.set("x-request-id", crypto.randomUUID());

    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/st_location/:path*"],
};
