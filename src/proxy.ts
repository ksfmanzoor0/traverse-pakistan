import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://traversepakistan.com",
  "https://www.traversepakistan.com",
  "https://traverse-pakistan.vercel.app",
  "https://sandbox.traversepakistan.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

const VERCEL_PREVIEW_RE = /^https:\/\/traverse-pakistan-[a-z0-9]+-ksfmanzoor0s-projects\.vercel\.app$/;

// CSRF protection: blocks cross-origin browser requests to /api/* from
// unlisted origins. Server-to-server calls (no origin header) are allowed
// through. Requests from any unlisted domain (e.g. attacker.com) get 403.
// Also injects x-request-id into every /api/* request for tracing.
export default function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && !ALLOWED_ORIGINS.includes(origin) && !VERCEL_PREVIEW_RE.test(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  const headers = new Headers(request.headers);
  headers.set("x-request-id", crypto.randomUUID());

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/api/:path*"],
};
