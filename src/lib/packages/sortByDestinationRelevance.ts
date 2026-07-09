import type { Package } from "@/types/package";

export type DestinationRankEntry = { rank?: number; hidden?: boolean; featured?: boolean };

export function readDestinationRankEntry(
  destinationRank: Package["destinationRank"] | undefined,
  slug: string,
): DestinationRankEntry {
  const val = destinationRank?.[slug];
  if (val == null) return {};
  if (typeof val === "number") return { rank: val };
  return val;
}

/**
 * Order packages for a destination view:
 *   1. featured entries first.
 *   2. If either side has an operator rank for this destination → rank ASC wins
 *      (unset → Infinity, sinks to the bottom). Curated order is authoritative.
 *   3. If NEITHER is ranked → primary-destination match first (safe default
 *      for unranked destinations).
 *   4. reviewCount DESC as final tie-breaker.
 *
 * Hidden entries are filtered out. Pure + non-mutating. Returns a new array.
 */
export function sortByDestinationRelevance<T extends Package>(packages: T[], slug: string): T[] {
  return packages
    .filter((p) => !readDestinationRankEntry(p.destinationRank, slug).hidden)
    .slice()
    .sort((a, b) => {
      const ea = readDestinationRankEntry(a.destinationRank, slug);
      const eb = readDestinationRankEntry(b.destinationRank, slug);

      const fa = ea.featured ? 1 : 0;
      const fb = eb.featured ? 1 : 0;
      if (fa !== fb) return fb - fa;

      const aHasRank = typeof ea.rank === "number";
      const bHasRank = typeof eb.rank === "number";
      if (aHasRank || bHasRank) {
        const ra = aHasRank ? ea.rank! : Infinity;
        const rb = bHasRank ? eb.rank! : Infinity;
        if (ra !== rb) return ra - rb;
      } else {
        const aPrimary = a.destinationSlug === slug ? 0 : 1;
        const bPrimary = b.destinationSlug === slug ? 0 : 1;
        if (aPrimary !== bPrimary) return aPrimary - bPrimary;
      }

      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    });
}
