import type { Tour } from "@/types/tour";

export type TourDestinationRankEntry = { rank?: number; hidden?: boolean; featured?: boolean };

export function readTourDestinationRankEntry(
  destinationRank: Tour["destinationRank"] | undefined,
  slug: string,
): TourDestinationRankEntry {
  const val = destinationRank?.[slug];
  if (val == null) return {};
  if (typeof val === "number") return { rank: val };
  return val;
}

/** Sort tours on a destination page. Featured first, then explicit rank ASC,
 *  else primary-destination match first, else reviewCount DESC. Hidden dropped. */
export function sortToursByDestinationRelevance<T extends Tour>(tours: T[], slug: string): T[] {
  return tours
    .filter((t) => !readTourDestinationRankEntry(t.destinationRank, slug).hidden)
    .slice()
    .sort((a, b) => {
      const ea = readTourDestinationRankEntry(a.destinationRank, slug);
      const eb = readTourDestinationRankEntry(b.destinationRank, slug);

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
