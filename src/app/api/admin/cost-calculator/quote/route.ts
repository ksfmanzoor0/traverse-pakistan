import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { quotePackageAddons, type HomeCity } from "@/services/addon-cost.service";
import { quotePackageHotels } from "@/services/hotel-allocation.service";

interface PackageHotelTier {
  slug: string;
  name: string;
  tier: string;
  pricePerNight: number;
  usedInSlots: ("deluxe" | "luxury")[];   // slot positions (a hotel can be used as both)
}

async function loadPackageHotelTiers(packageSlug: string): Promise<PackageHotelTier[]> {
  const supabase = getSupabaseAdmin();
  const { data: days, error: daysErr } = await supabase
    .from("package_itinerary_days")
    .select("hotel_deluxe, hotel_luxury")
    .eq("package_slug", packageSlug);
  if (daysErr) throw new Error(`loadPackageHotelTiers days: ${daysErr.message}`);

  const slotsBySlug = new Map<string, Set<"deluxe" | "luxury">>();
  for (const r of (days ?? []) as Array<{ hotel_deluxe: string | null; hotel_luxury: string | null }>) {
    if (r.hotel_deluxe) {
      const s = slotsBySlug.get(r.hotel_deluxe) ?? new Set();
      s.add("deluxe");
      slotsBySlug.set(r.hotel_deluxe, s);
    }
    if (r.hotel_luxury) {
      const s = slotsBySlug.get(r.hotel_luxury) ?? new Set();
      s.add("luxury");
      slotsBySlug.set(r.hotel_luxury, s);
    }
  }
  if (slotsBySlug.size === 0) return [];

  const { data: hotels, error: hotelsErr } = await supabase
    .from("hotels")
    .select("slug, name, tier, price_per_night")
    .in("slug", Array.from(slotsBySlug.keys()));
  if (hotelsErr) throw new Error(`loadPackageHotelTiers hotels: ${hotelsErr.message}`);

  return ((hotels ?? []) as Array<{ slug: string; name: string; tier: string; price_per_night: number | null }>)
    .map((h) => ({
      slug: h.slug,
      name: h.name,
      tier: h.tier,
      pricePerNight: h.price_per_night ?? 0,
      usedInSlots: Array.from(slotsBySlug.get(h.slug) ?? []),
    }))
    .sort((a, b) => a.tier.localeCompare(b.tier) || a.name.localeCompare(b.name));
}

const HOME_CITIES: HomeCity[] = ["ISB", "LHE", "KHI"];

function isHome(v: string | null): v is HomeCity {
  return v !== null && (HOME_CITIES as string[]).includes(v);
}

export async function GET(req: Request) {
  await requireAdmin();

  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");
  const home = url.searchParams.get("home");
  const startDate = url.searchParams.get("startDate");
  const tierRaw = url.searchParams.get("tier");
  const peopleRaw = url.searchParams.get("people");

  if (!slug || !isHome(home) || !startDate) {
    return NextResponse.json(
      { error: "Required: slug, home (ISB|LHE|KHI), startDate (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const tier: "deluxe" | "premium" | "luxury" =
    tierRaw === "luxury" ? "luxury" : tierRaw === "premium" ? "premium" : "deluxe";
  const people = Math.max(1, Number(peopleRaw) || 2);

  const supabase = getSupabaseAdmin();
  const { data: pkg, error } = await supabase
    .from("packages")
    .select("slug, name, duration, starting_cities, total_distance_km")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const row = pkg as {
    slug: string;
    name: string;
    duration: number;
    starting_cities: string[];
    total_distance_km: number | null;
  };
  const startingCities = row.starting_cities ?? [];
  const allowPradoNCP = startingCities.includes("KDU") || startingCities.includes("GIL");

  // LHE extension applies when the canonical vehicle starts in ISB and the
  // traveler picks Lahore — vehicle drives ISB↔LHE extra both ways. Skardu
  // fly-in (KDU) and KHI-canonical packages do not get the extension.
  const LHE_EXTENSION_KM = 800;
  const baseDistance = row.total_distance_km ?? 0;

  const [flightQuote, hotelQuote, hotelsForBothTiers] = await Promise.all([
    quotePackageAddons({ packageSlug: slug, homeCity: home, startDate }),
    quotePackageHotels({ packageSlug: slug, tier, people, startDate, homeCity: home }),
    loadPackageHotelTiers(slug),
  ]);

  // LHE road extension only applies when LHE drives. A required flight addon
  // for LHE means it flies to the canonical departure city — no extra km.
  const lheFliesIn = home === "LHE" && ((flightQuote?.addons.filter((a) => a.isRequired).length ?? 0) > 0);
  const extensionKm = !lheFliesIn && startingCities.includes("ISB") && home === "LHE" ? LHE_EXTENSION_KM : 0;
  const totalDistanceKm = baseDistance + extensionKm;

  return NextResponse.json({
    slug: row.slug,
    name: row.name,
    duration: row.duration,
    nights: Math.max(1, row.duration - 1),
    startingCities,
    allowPradoNCP,
    tier,
    people,
    totalDistanceKm,
    baseDistanceKm: baseDistance,
    extensionKm,
    flightRequired: !flightQuote?.homeInStartingCities && (flightQuote?.addons.length ?? 0) > 0,
    flightCostPerPerson: flightQuote?.addonCostPerPerson ?? 0,
    flightBreakdown:
      flightQuote?.addons.flatMap((a) =>
        (a.flightLegs ?? []).map((l) => ({
          from: l.from,
          to: l.to,
          date: l.departDate,
          perPerson: l.perPerson,
          source: l.source,
          carriers: l.carriers,
        })),
      ) ?? [],
    homeInStartingCities: flightQuote?.homeInStartingCities ?? false,
    hotelTotalCost: hotelQuote?.totalCost ?? 0,
    hotelNights:
      hotelQuote?.nights.map((n) => ({
        dayNumber: n.dayNumber,
        date: n.date,
        hotelSlug: n.hotelSlug,
        hotelName: n.allocation?.hotelName ?? null,
        seasonLabel: n.allocation?.seasonLabel ?? null,
        rooms: n.allocation?.rooms ?? [],
        totalCost: n.allocation?.totalCost ?? 0,
      })) ?? [],
    hotelWarnings: hotelQuote?.warnings ?? [],
    hotelsInPackage: hotelsForBothTiers,
  });
}
