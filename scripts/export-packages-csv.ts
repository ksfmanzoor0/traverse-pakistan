import { packages } from "../src/data/packages";
import { packageItineraries } from "../src/data/package-itineraries";
import { writeFileSync } from "fs";

// Build itinerary summary map: packageSlug → brief summary
const itineraryMap: Record<string, string> = {};
for (const it of packageItineraries) {
  // Deduplicate days by dayNumber (cityOnly variants of same day appear multiple times)
  const seen = new Set<number>();
  const parts: string[] = [];
  for (const day of it.days) {
    if (seen.has(day.dayNumber)) continue;
    seen.add(day.dayNumber);
    parts.push(`D${day.dayNumber}: ${day.title}`);
  }
  itineraryMap[it.packageSlug] = parts.join(" | ");
}

// CSV helpers
function esc(v: string | null | undefined): string {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}
function num(v: number | null | undefined): string {
  return v == null ? "" : String(v);
}
function bool(v: boolean): string {
  return v ? "true" : "false";
}

const headers = [
  "id", "slug", "name", "badge", "duration", "route",
  "destinationSlug", "relatedDestinationSlugs", "regionSlug",
  "rating", "reviewCount", "maxGroupSize", "languages",
  "freeCancellation", "reserveNowPayLater",
  "deluxe_islamabad", "deluxe_lahore", "deluxe_karachi", "deluxe_singleSupplement",
  "luxury_islamabad", "luxury_lahore", "luxury_karachi", "luxury_singleSupplement",
  "highlights", "inclusions", "exclusions", "knowBeforeYouGo",
  "description", "metaTitle", "metaDescription",
  "itinerary_summary",
];

const rows = packages.map(p => {
  const d = p.tiers.deluxe;
  const l = p.tiers.luxury;
  return [
    esc(p.id),
    esc(p.slug),
    esc(p.name),
    esc(p.badge),
    num(p.duration),
    esc(p.route),
    esc(p.destinationSlug),
    esc((p.relatedDestinationSlugs ?? []).join("; ")),
    esc(p.regionSlug),
    num(p.rating),
    num(p.reviewCount),
    num(p.maxGroupSize),
    esc(p.languages.join("; ")),
    bool(p.freeCancellation),
    bool(p.reserveNowPayLater),
    num(d.islamabad), num(d.lahore), num(d.karachi), num(d.singleSupplement),
    num(l.islamabad), num(l.lahore), num(l.karachi), num(l.singleSupplement),
    esc(p.highlights.join(" | ")),
    esc(p.inclusions.join(" | ")),
    esc(p.exclusions.join(" | ")),
    esc(p.knowBeforeYouGo.join(" | ")),
    esc(p.description),
    esc(p.metaTitle),
    esc(p.metaDescription),
    esc(itineraryMap[p.slug] ?? ""),
  ].join(",");
});

const csv = [headers.join(","), ...rows].join("\n");
writeFileSync("packages.csv", csv, "utf8");
console.log(`Exported ${packages.length} packages to packages.csv`);
