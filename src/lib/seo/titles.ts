import type { Hotel } from "@/types/hotel";
import { formatPrice } from "@/lib/utils";

/**
 * Title budget. The root layout appends " | Traverse Pakistan" (20 chars) and
 * Google truncates around 60-65, so the base title gets ~45. Same ceiling
 * polishTitleForCtr() enforces in ./metadata.
 */
const MAX_BASE_TITLE = 45;

const fits = (s: string) => s.length <= MAX_BASE_TITLE;

/**
 * Hotel title tuned for the queries these pages actually receive.
 *
 * Search Console, 26 Aug - 14 Sep 2026: /hotels/luxus-naran took 3,453
 * impressions at average position 8.5 and returned 4 clicks (0.12%). The
 * query set is "luxus naran hotel", "luxus naran booking", "luxus naran
 * hotel price" - people checking a rate before booking. The title they saw
 * was "Luxus Naran - Luxury Stay in Naran", which spends 20 characters
 * restating what the searcher already knew and answers nothing.
 *
 * A nightly "from" rate is the one fact that converts this intent, so it
 * takes priority over the tier label. pricePerNight is the entry price
 * (lowest room, lowest season) - the same figure the listing cards show, so
 * the SERP and the page agree.
 *
 * Falls back down a ladder because hotel names run from "Luxus Naran" (11
 * chars) to "The Spruce Resorts Shogran" (26), and a truncated title in the
 * SERP is worse than a shorter complete one.
 */
export function hotelTitle(
  hotel: Pick<Hotel, "name" | "location" | "tier" | "pricePerNight">
): string {
  const name = hotel.name.trim();
  const destLabel = (hotel.location.split(",")[0] ?? hotel.location).trim();
  // Most names already carry their town ("Luxus Naran", "Chinar Resort
  // Sharan") - appending it again reads as keyword stuffing and wastes budget.
  const nameHasDest =
    destLabel.length > 0 && name.toLowerCase().includes(destLabel.toLowerCase());
  const base = !destLabel || nameHasDest ? name : `${name}, ${destLabel}`;
  const tierLabel = hotel.tier.charAt(0).toUpperCase() + hotel.tier.slice(1);
  const rate =
    hotel.pricePerNight > 0 ? `${formatPrice(hotel.pricePerNight)}/night` : "";

  const ladder = rate
    ? [
        `${base} — from ${rate}`,
        `${name} — from ${rate}`,
        `${base} — ${tierLabel} Stay`,
        `${name} — ${tierLabel} Stay`,
        name,
      ]
    : [`${base} — ${tierLabel} Stay`, `${name} — ${tierLabel} Stay`, name];

  return ladder.find(fits) ?? name;
}

/**
 * Hotel meta description leading with the rate, for the same reason as the
 * title. Google rewrites descriptions often, but when it does keep ours the
 * first clause should answer the query rather than open with prose.
 */
export function hotelDescription(
  hotel: Pick<Hotel, "name" | "location" | "propertyType" | "description" | "pricePerNight">
): string {
  const lead =
    hotel.pricePerNight > 0
      ? `${hotel.name} — ${hotel.propertyType} in ${hotel.location}. Rooms from ${formatPrice(hotel.pricePerNight)}/night. `
      : `${hotel.name} — ${hotel.propertyType} in ${hotel.location}. `;
  const room = Math.max(0, 158 - lead.length);
  if (hotel.description.length <= room) return `${lead}${hotel.description}`.trim();
  // Cut on a word boundary — a description sliced mid-word reads as broken
  // in the SERP.
  const cut = hotel.description.slice(0, room);
  const lastSpace = cut.lastIndexOf(" ");
  const body = (lastSpace > room * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, "");
  return `${lead}${body}…`.trim();
}
