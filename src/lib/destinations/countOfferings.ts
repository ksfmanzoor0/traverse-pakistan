import type { Destination } from "@/types/destination";
import type { Package } from "@/types/package";
import type { Tour } from "@/types/tour";

/**
 * Build slug → count maps for packages and group tours, with **ancestor
 * rollup**: a child destination inherits any offering that matches its
 * parent (or any ancestor) too — so browsing "Altit" surfaces packages
 * curated at the Hunza level.
 *
 * A package counts against a destination if the package's `destinationSlug`
 * or any of its `relatedDestinationSlugs` matches the destination's own slug
 * OR any of its ancestor slugs.
 */
export function countDestinationOfferings(
  destinations: Destination[],
  packages: Pick<Package, "destinationSlug" | "relatedDestinationSlugs">[],
  tours: Pick<Tour, "destinationSlug">[],
): { packageCountBySlug: Map<string, number>; tourCountBySlug: Map<string, number> } {
  const packageCountBySlug = new Map<string, number>();
  const tourCountBySlug = new Map<string, number>();

  for (const dest of destinations) {
    const bucket = new Set<string>([dest.slug, ...(dest.ancestorSlugs ?? [])]);
    let pkgCount = 0;
    for (const pkg of packages) {
      const pkgSlugs = new Set<string>([
        pkg.destinationSlug,
        ...(pkg.relatedDestinationSlugs ?? []),
      ]);
      for (const s of pkgSlugs) {
        if (s && bucket.has(s)) {
          pkgCount += 1;
          break;
        }
      }
    }
    if (pkgCount > 0) packageCountBySlug.set(dest.slug, pkgCount);

    let tourCount = 0;
    for (const t of tours) {
      if (t.destinationSlug && bucket.has(t.destinationSlug)) tourCount += 1;
    }
    if (tourCount > 0) tourCountBySlug.set(dest.slug, tourCount);
  }

  return { packageCountBySlug, tourCountBySlug };
}
