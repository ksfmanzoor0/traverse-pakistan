import { packages } from "../src/data/packages";
import { packageItineraries } from "../src/data/package-itineraries";

function esc(s: string | null | undefined): string {
  if (s == null) return "NULL";
  return `'${s.replace(/'/g, "''")}'`;
}

function escArr(arr: string[] | undefined | null): string {
  if (!arr || arr.length === 0) return "'{}'";
  return `ARRAY[${arr.map((s) => esc(s)).join(",")}]`;
}

function escJson(val: unknown): string {
  if (val == null) return "NULL";
  return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
}

function escBool(b: boolean): string {
  return b ? "true" : "false";
}

function escNum(n: number | null | undefined): string {
  if (n == null) return "NULL";
  return String(n);
}

const lines: string[] = [];

// ── packages ──────────────────────────────────────────────────────────────────
lines.push("-- PACKAGES");
lines.push("INSERT INTO packages (");
lines.push("  slug, name, description, badge, duration, route,");
lines.push("  destination_slug, related_destination_slugs, region_slug,");
lines.push("  rating, review_count, max_group_size, languages,");
lines.push("  free_cancellation, reserve_now_pay_later,");
lines.push("  images, highlights, inclusions, exclusions, know_before_you_go,");
lines.push("  pricing, meta_title, meta_description");
lines.push(") VALUES");

const pkgRows = packages.map((p) => {
  const pricing = p.tiers ?? null;
  return `(
  ${esc(p.slug)}, ${esc(p.name)}, ${esc(p.description)}, ${esc(p.badge)}, ${escNum(p.duration)}, ${esc(p.route)},
  ${esc(p.destinationSlug)}, ${escArr(p.relatedDestinationSlugs)}, ${esc(p.regionSlug)},
  ${escNum(p.rating)}, ${escNum(p.reviewCount)}, ${escNum(p.maxGroupSize)}, ${escArr(p.languages)},
  ${escBool(p.freeCancellation)}, ${escBool(p.reserveNowPayLater)},
  ${escJson(p.images)}, ${escArr(p.highlights)}, ${escArr(p.inclusions)}, ${escArr(p.exclusions)}, ${escArr(p.knowBeforeYouGo)},
  ${escJson(pricing)}, ${esc(p.metaTitle)}, ${esc(p.metaDescription)}
)`;
});

lines.push(pkgRows.join(",\n") + ";");

// ── itinerary days ────────────────────────────────────────────────────────────
lines.push("\n-- PACKAGE ITINERARY DAYS");
lines.push("INSERT INTO package_itinerary_days (");
lines.push("  package_slug, day_number, title, description,");
lines.push("  hotel_deluxe, hotel_luxury, stops, driving_time, overnight, city_only");
lines.push(") VALUES");

const dayRows: string[] = [];

for (const itinerary of packageItineraries) {
  for (const day of itinerary.days) {
    const cityOnly = day.cityOnly == null
      ? "NULL"
      : Array.isArray(day.cityOnly)
        ? escArr(day.cityOnly)
        : escArr([day.cityOnly]);

    dayRows.push(`(
  ${esc(itinerary.packageSlug)}, ${escNum(day.dayNumber)}, ${esc(day.title)}, ${esc(day.description)},
  ${esc(day.hotels?.deluxe || null)}, ${esc(day.hotels?.luxury || null)}, ${escJson(day.stops)},
  ${esc(day.drivingTime)}, ${esc(day.overnight)}, ${cityOnly}
)`);
  }
}

lines.push(dayRows.join(",\n") + ";");

process.stdout.write(lines.join("\n") + "\n");
