import type { Package } from "@/types/package";

/**
 * Order packages for a destination view:
 *   1. If either side has an operator rank for this destination → rank ASC wins
 *      (unset → Infinity, sinks to the bottom). Curated order is authoritative.
 *   2. If NEITHER is ranked → primary-destination match first (safe default
 *      for unranked destinations).
 *   3. reviewCount DESC as final tie-breaker.
 *
 * Pure + non-mutating. Returns a new array.
 */
export function sortByDestinationRelevance<T extends Package>(packages: T[], slug: string): T[] {
  return [...packages].sort((a, b) => {
    const aRank = a.destinationRank?.[slug];
    const bRank = b.destinationRank?.[slug];
    const aHasRank = typeof aRank === "number";
    const bHasRank = typeof bRank === "number";

    if (aHasRank || bHasRank) {
      const ra = aHasRank ? aRank! : Infinity;
      const rb = bHasRank ? bRank! : Infinity;
      if (ra !== rb) return ra - rb;
    } else {
      const aPrimary = a.destinationSlug === slug ? 0 : 1;
      const bPrimary = b.destinationSlug === slug ? 0 : 1;
      if (aPrimary !== bPrimary) return aPrimary - bPrimary;
    }

    return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  });
}
