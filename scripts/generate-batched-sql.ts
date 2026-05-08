import { packages } from "../src/data/packages";
import { packageItineraries } from "../src/data/package-itineraries";
import fs from "fs";

function esc(s: string | null | undefined): string {
  if (s == null) return "NULL";
  return "'" + s.replace(/'/g, "''") + "'";
}

function escArr(arr: string[] | undefined | null): string {
  if (!arr || arr.length === 0) return "'{}'";
  return "ARRAY[" + arr.map(esc).join(",") + "]";
}

function escJson(val: unknown): string {
  if (val == null) return "NULL";
  return "'" + JSON.stringify(val).replace(/'/g, "''") + "'::jsonb";
}

function escBool(b: boolean): string {
  return b ? "true" : "false";
}

function escNum(n: number | null | undefined): string {
  if (n == null) return "NULL";
  return String(n);
}

const PKG_COLS = "slug,name,description,badge,duration,route,destination_slug,related_destination_slugs,region_slug,rating,review_count,max_group_size,languages,free_cancellation,reserve_now_pay_later,images,highlights,inclusions,exclusions,know_before_you_go,pricing,meta_title,meta_description";

const DAY_COLS = "package_slug,day_number,title,description,hotel_deluxe,hotel_luxury,stops,driving_time,overnight,city_only";

// ── packages ──────────────────────────────────────────────────────────────────
const PBATCH = 10;
const pbatches = Math.ceil(packages.length / PBATCH);

for (let b = 0; b < pbatches; b++) {
  const slice = packages.slice(b * PBATCH, (b + 1) * PBATCH);
  const rows = slice.map((p) => {
    return [
      "(",
      [
        esc(p.slug),
        esc(p.name),
        esc(p.description),
        esc(p.badge),
        escNum(p.duration),
        esc(p.route),
        esc(p.destinationSlug),
        escArr(p.relatedDestinationSlugs),
        esc(p.regionSlug),
        escNum(p.rating),
        escNum(p.reviewCount),
        escNum(p.maxGroupSize),
        escArr(p.languages),
        escBool(p.freeCancellation),
        escBool(p.reserveNowPayLater),
        escJson(p.images),
        escArr(p.highlights),
        escArr(p.inclusions),
        escArr(p.exclusions),
        escArr(p.knowBeforeYouGo),
        escJson(p.tiers ?? null),
        esc(p.metaTitle),
        esc(p.metaDescription),
      ].join(","),
      ")",
    ].join("\n");
  });

  const sql = `INSERT INTO packages (${PKG_COLS}) VALUES\n${rows.join(",\n")};`;
  fs.writeFileSync(`/tmp/pkg-batch-${b}.sql`, sql);
}

// ── itinerary days ────────────────────────────────────────────────────────────
const allDays: string[] = [];

for (const it of packageItineraries) {
  for (const day of it.days) {
    const co =
      day.cityOnly == null
        ? "NULL"
        : Array.isArray(day.cityOnly)
        ? escArr(day.cityOnly)
        : escArr([day.cityOnly as string]);

    allDays.push(
      "(" +
        [
          esc(it.packageSlug),
          escNum(day.dayNumber),
          esc(day.title),
          esc(day.description),
          esc(day.hotels?.deluxe || null),
          esc(day.hotels?.luxury || null),
          escJson(day.stops),
          esc(day.drivingTime),
          esc(day.overnight),
          co,
        ].join(",") +
        ")"
    );
  }
}

const DBATCH = 150;
const dbatches = Math.ceil(allDays.length / DBATCH);

for (let b = 0; b < dbatches; b++) {
  const slice = allDays.slice(b * DBATCH, (b + 1) * DBATCH);
  const sql = `INSERT INTO package_itinerary_days (${DAY_COLS}) VALUES\n${slice.join(",\n")};`;
  fs.writeFileSync(`/tmp/day-batch-${b}.sql`, sql);
}

console.log(`packages: ${pbatches} batches (${packages.length} total)`);
console.log(`itinerary: ${dbatches} batches (${allDays.length} total days)`);
