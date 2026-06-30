"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Route-segment error boundary. Catches uncaught render-time errors inside any
 * page or layout, replacing Next's default framework-leaking error page with a
 * branded shell + a Try Again that re-runs the segment. Errors are surfaced to
 * the console (and any installed monitoring SDK) via `useEffect`.
 *
 * For root-layout failures (very rare), Next falls through to `global-error.tsx`
 * — we don't have one yet because the layout has been stable; add later if a
 * crash happens above this boundary.
 */
export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Route segment crashed:", error);
  }, [error]);

  return (
    <div className="py-20 sm:py-28">
      <Container>
        <EmptyState
          icon="compass"
          title="Something went off-trail"
          description="We hit an unexpected error rendering this page. The crew has been pinged. Try again — usually a reload fixes it."
          action={
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={reset}>Try again</Button>
              <Link href="/">
                <Button variant="outline" size="lg">Back to Home</Button>
              </Link>
            </div>
          }
        />
      </Container>
    </div>
  );
}
