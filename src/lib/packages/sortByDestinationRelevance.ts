import type { Package } from "@/types/package";

/**
 * Order packages for a destination view:
 *   1. Primary-destination matches before secondary (related-only) matches
 *   2. Operator rank from `destination_rank[slug]` ASC (unset → Infinity)
 *   3. reviewCount DESC as a stable tie-breaker
 *
 * Pure + non-mutating. Returns a new array.
 */
export function sortByDestinationRelevance<T extends Package>(packages: T[], slug: string): T[] {
  return [...packages].sort((a, b) => {
    const aPrimary = a.destinationSlug === slug ? 0 : 1;
    const bPrimary = b.destinationSlug === slug ? 0 : 1;
    if (aPrimary !== bPrimary) return aPrimary - bPrimary;

    const aRank = a.destinationRank?.[slug] ?? Infinity;
    const bRank = b.destinationRank?.[slug] ?? Infinity;
    if (aRank !== bRank) return aRank - bRank;

    return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
  });
}
