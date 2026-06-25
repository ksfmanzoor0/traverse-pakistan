import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { quotePackageAddons, type HomeCity } from "@/services/addon-cost.service";

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

  if (!slug || !isHome(home) || !startDate) {
    return NextResponse.json(
      { error: "Required: slug, home (ISB|LHE|KHI), startDate (YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { data: pkg, error } = await supabase
    .from("packages")
    .select("slug, name, duration, starting_cities")
    .eq("slug", slug)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const row = pkg as { slug: string; name: string; duration: number; starting_cities: string[] };
  const startingCities = row.starting_cities ?? [];
  const allowPradoNCP = startingCities.includes("KDU") || startingCities.includes("GIL");

  const quote = await quotePackageAddons({ packageSlug: slug, homeCity: home, startDate });

  return NextResponse.json({
    slug: row.slug,
    name: row.name,
    duration: row.duration,
    nights: Math.max(1, row.duration - 1),
    startingCities,
    allowPradoNCP,
    flightRequired: !quote?.homeInStartingCities && (quote?.addons.length ?? 0) > 0,
    flightCostPerPerson: quote?.addonCostPerPerson ?? 0,
    flightBreakdown:
      quote?.addons.flatMap((a) =>
        (a.flightLegs ?? []).map((l) => ({
          from: l.from,
          to: l.to,
          date: l.departDate,
          perPerson: l.perPerson,
          source: l.source,
          carriers: l.carriers,
        })),
      ) ?? [],
    homeInStartingCities: quote?.homeInStartingCities ?? false,
  });
}
