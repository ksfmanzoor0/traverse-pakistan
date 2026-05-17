import { hotels } from "../src/data/hotels";
import fs from "fs";

const rows: string[] = [
  [
    "id", "slug", "name", "destination_slug", "location", "tier", "property_type",
    "image", "rating", "review_count", "price_per_night",
    "amenities", "description", "highlights",
    "rooms", "check_in", "check_out",
    "policies_rules", "policies_safety", "policies_cancellation",
    "images"
  ].join(",")
];

function csv(val: unknown): string {
  const s = Array.isArray(val) ? val.join(" | ") : String(val ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

for (const h of hotels) {
  rows.push([
    csv(h.id),
    csv(h.slug),
    csv(h.name),
    csv(h.destinationSlug),
    csv(h.location),
    csv(h.tier),
    csv(h.propertyType),
    csv(h.image),
    csv(h.rating),
    csv(h.reviewCount),
    csv(h.pricePerNight),
    csv(h.amenities),
    csv(h.description),
    csv(h.highlights),
    csv(h.rooms.map(r => `${r.name} (${r.beds}) PKR ${r.price}`)),
    csv(h.checkIn),
    csv(h.checkOut),
    csv(h.policies.rules),
    csv(h.policies.safety),
    csv(h.policies.cancellation),
    csv(h.images),
  ].join(","));
}

const out = "/Users/kashifmanzoor/Desktop/hotels.csv";
fs.writeFileSync(out, rows.join("\n"));
console.log(`Written ${hotels.length} hotels → ${out}`);
