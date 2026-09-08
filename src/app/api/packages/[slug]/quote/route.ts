import { NextResponse } from "next/server";
import { quotePackage, type Tier } from "@/services/package-quote.service";
import type { HomeCity } from "@/services/addon-cost.service";
import { pickEarliestQuotableStartDate } from "@/services/next-quotable-date.service";

const VALID_HOMES = new Set(["ISB", "LHE", "KHI"]);
const VALID_TIERS = new Set(["deluxe", "luxury", "premium"]);

function isHome(v: string | null): v is HomeCity {
  return v !== null && VALID_HOMES.has(v);
}
function isTier(v: string | null): v is Tier {
  return v !== null && VALID_TIERS.has(v);
}

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export async function GET(
  req: Request,
  context: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await context.params;
  const url = new URL(req.url);
  const home = url.searchParams.get("home");
  const tier = url.searchParams.get("tier");
  const paxRaw = url.searchParams.get("pax");
  let startDate = url.searchParams.get("startDate");

  if (!isHome(home)) {
    return NextResponse.json({ error: "home must be ISB | LHE | KHI" }, { status: 400 });
  }
  if (!isTier(tier)) {
    return NextResponse.json({ error: "tier must be deluxe | luxury | premium" }, { status: 400 });
  }
  // `startDate=auto` → server picks the earliest upcoming date that has a
  // scraped flight fare for this package's outbound leg from `home`. Used by
  // the wizard/sidebar mount fetch so the quote reflects a date the customer
  // could realistically pick, not a blind today+30d anchor.
  if (startDate === "auto") {
    startDate = await pickEarliestQuotableStartDate(slug, home);
  }
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return NextResponse.json({ error: "startDate must be YYYY-MM-DD or 'auto'" }, { status: 400 });
  }
  // Reject far-past / far-future dates so a malicious caller can't churn the
  // flight resolver on dates that will never match a scraped fare.
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || start < now - 30 * 24 * 60 * 60 * 1000 || start > now + ONE_YEAR_MS) {
    return NextResponse.json({ error: "startDate must be within the next 12 months" }, { status: 400 });
  }
  const adults = Math.max(1, Math.min(40, Number(paxRaw) || 2));
  const children_5_12 = Math.max(0, Math.min(20, Number(url.searchParams.get("children_5_12")) || 0));
  const children_2_5 = Math.max(0, Math.min(20, Number(url.searchParams.get("children_2_5")) || 0));
  const infants = Math.max(0, Math.min(10, Number(url.searchParams.get("infants")) || 0));
  const roomsRaw = url.searchParams.get("rooms");
  const roomsParsed = roomsRaw === null ? undefined : Math.floor(Number(roomsRaw));
  const paxBillable = adults + children_5_12 + children_2_5;
  const rooms = Number.isFinite(roomsParsed) && (roomsParsed as number) > 0
    ? Math.min(paxBillable, roomsParsed as number)
    : undefined;

  try {
    const quote = await quotePackage({ slug, home, tier, pax: adults, adults, children_5_12, children_2_5, infants, startDate, rooms });
    if (!quote) return NextResponse.json({ error: "Package not found" }, { status: 404 });
    // Only ship customer-safe fields — margin / internal breakdown stays server-side.
    return NextResponse.json({
      slug: quote.slug,
      duration: quote.duration,
      nights: quote.nights,
      tier: quote.tier,
      pax: quote.pax,
      adults: quote.adults,
      children_5_12: quote.children_5_12,
      children_2_5: quote.children_2_5,
      infants: quote.infants,
      rooms: quote.rooms,
      home: quote.home,
      startDate: quote.startDate,
      total: quote.total,
      perPerson: quote.perPerson,
      perAdult: quote.perAdult,
      perChild_5_12: quote.perChild_5_12,
      perChild_2_5: quote.perChild_2_5,
      perInfant: quote.perInfant,
      unresolved: quote.unresolved,
      vehicle: quote.vehicle,
      flightPerPerson: quote.flightPerPerson,
      flightTicketType: quote.flightTicketType,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
