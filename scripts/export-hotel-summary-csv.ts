import { hotels } from "../src/data/hotels";
import { packageItineraries } from "../src/data/package-itineraries";
import { packages } from "../src/data/packages";
import { writeFileSync } from "fs";

// Build map: hotelSlug → package names that reference it in itinerary hotels
const hotelToPackages: Record<string, string[]> = {};

for (const it of packageItineraries) {
  const pkg = packages.find(p => p.slug === it.packageSlug);
  const pkgName = pkg?.name ?? it.packageSlug;
  for (const day of it.days) {
    for (const slug of [day.hotels.deluxe, day.hotels.luxury]) {
      if (!slug) continue;
      if (!hotelToPackages[slug]) hotelToPackages[slug] = [];
      if (!hotelToPackages[slug].includes(pkgName)) {
        hotelToPackages[slug].push(pkgName);
      }
    }
  }
}

function esc(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

const header = ["Hotel Name", "Slug", "Destination Slug", "Tier", "Room Categories", "Linked Packages"].join(",");

const rows = hotels.map(h => {
  const rooms = h.rooms.map(r => r.name).join(" | ");
  const linked = (hotelToPackages[h.slug] ?? []).join(" | ");
  return [
    esc(h.name),
    esc(h.slug),
    esc(h.destinationSlug),
    esc(h.tier),
    esc(rooms),
    esc(linked),
  ].join(",");
});

const csv = [header, ...rows].join("\n");
const out = "/Users/kashifmanzoor/Desktop/traverse_hotels.csv";
writeFileSync(out, csv, "utf8");
console.log(`Written ${hotels.length} hotels → ${out}`);
