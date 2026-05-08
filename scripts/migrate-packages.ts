import { createClient } from "@supabase/supabase-js";
import { packages } from "../src/data/packages";
import { packageItineraries } from "../src/data/package-itineraries";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function run() {
  // ── packages ──────────────────────────────────────────────
  console.log(`Inserting ${packages.length} packages...`);

  const pkgRows = packages.map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description,
    badge: p.badge,
    duration: p.duration,
    route: p.route,
    destination_slug: p.destinationSlug,
    related_destination_slugs: p.relatedDestinationSlugs ?? [],
    region_slug: p.regionSlug,
    rating: p.rating,
    review_count: p.reviewCount,
    max_group_size: p.maxGroupSize,
    languages: p.languages,
    free_cancellation: p.freeCancellation,
    reserve_now_pay_later: p.reserveNowPayLater,
    images: p.images,
    highlights: p.highlights,
    inclusions: p.inclusions,
    exclusions: p.exclusions,
    know_before_you_go: p.knowBeforeYouGo,
    pricing: p.tiers ?? null,
    meta_title: p.metaTitle,
    meta_description: p.metaDescription,
  }));

  // Insert in batches of 10 to avoid payload limits
  const BATCH = 10;
  for (let i = 0; i < pkgRows.length; i += BATCH) {
    const batch = pkgRows.slice(i, i + BATCH);
    const { error } = await supabase.from("packages").upsert(batch, { onConflict: "slug" });
    if (error) {
      console.error(`Package batch ${i / BATCH} failed:`, error.message);
      process.exit(1);
    }
    console.log(`  packages ${i + 1}–${Math.min(i + BATCH, pkgRows.length)} done`);
  }

  // ── itinerary days ────────────────────────────────────────
  const dayRows: object[] = [];

  for (const it of packageItineraries) {
    for (const day of it.days) {
      dayRows.push({
        package_slug: it.packageSlug,
        day_number: day.dayNumber,
        title: day.title,
        description: day.description,
        hotel_deluxe: day.hotels?.deluxe || null,
        hotel_luxury: day.hotels?.luxury || null,
        stops: day.stops ?? [],
        driving_time: day.drivingTime,
        overnight: day.overnight,
        city_only: day.cityOnly == null
          ? null
          : Array.isArray(day.cityOnly)
          ? day.cityOnly
          : [day.cityOnly as string],
      });
    }
  }

  console.log(`\nInserting ${dayRows.length} itinerary days...`);

  const DBATCH = 100;
  for (let i = 0; i < dayRows.length; i += DBATCH) {
    const batch = dayRows.slice(i, i + DBATCH);
    const { error } = await supabase.from("package_itinerary_days").insert(batch);
    if (error) {
      console.error(`Day batch ${i / DBATCH} failed:`, error.message);
      process.exit(1);
    }
    console.log(`  days ${i + 1}–${Math.min(i + DBATCH, dayRows.length)} done`);
  }

  console.log("\nMigration complete.");
}

run().catch((e) => { console.error(e); process.exit(1); });
