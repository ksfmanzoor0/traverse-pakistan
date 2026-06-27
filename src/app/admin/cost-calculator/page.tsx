import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { listVehicleTypes, getEngineConfig } from "@/services/vehicle.service";
import { CostCalculator, type PackagePickerEntry, type HotelTierSummary, type PackageLinkedHotel } from "@/components/admin/cost-calculator/CostCalculator";

async function loadAllPackageLinkedHotels(): Promise<PackageLinkedHotel[]> {
  const supabase = getSupabaseAdmin();
  const { data: dayRows, error: dayErr } = await supabase
    .from("package_itinerary_days")
    .select("hotel_deluxe, hotel_luxury");
  if (dayErr) throw new Error(`loadAllPackageLinkedHotels days: ${dayErr.message}`);
  const slots = new Map<string, Set<"deluxe" | "luxury">>();
  for (const r of (dayRows ?? []) as Array<{ hotel_deluxe: string | null; hotel_luxury: string | null }>) {
    if (r.hotel_deluxe) {
      const s = slots.get(r.hotel_deluxe) ?? new Set();
      s.add("deluxe"); slots.set(r.hotel_deluxe, s);
    }
    if (r.hotel_luxury) {
      const s = slots.get(r.hotel_luxury) ?? new Set();
      s.add("luxury"); slots.set(r.hotel_luxury, s);
    }
  }
  if (slots.size === 0) return [];
  const { data: hotels, error } = await supabase
    .from("hotels")
    .select("slug, name, tier, price_per_night")
    .in("slug", Array.from(slots.keys()));
  if (error) throw new Error(`loadAllPackageLinkedHotels hotels: ${error.message}`);
  return ((hotels ?? []) as Array<{ slug: string; name: string; tier: string; price_per_night: number | null }>)
    .map((h) => ({
      slug: h.slug,
      name: h.name,
      tier: h.tier,
      pricePerNight: h.price_per_night ?? 0,
      usedInSlots: Array.from(slots.get(h.slug) ?? []),
    }))
    .sort((a, b) => a.tier.localeCompare(b.tier) || a.name.localeCompare(b.name));
}

async function loadHotelTierSummaries(): Promise<HotelTierSummary[]> {
  const supabase = getSupabaseAdmin();

  // Only hotels actually referenced by a package itinerary day.
  const { data: dayRows, error: dayErr } = await supabase
    .from("package_itinerary_days")
    .select("hotel_deluxe, hotel_luxury");
  if (dayErr) throw new Error(`loadHotelTierSummaries days: ${dayErr.message}`);
  const linkedSlugs = new Set<string>();
  for (const r of (dayRows ?? []) as Array<{ hotel_deluxe: string | null; hotel_luxury: string | null }>) {
    if (r.hotel_deluxe) linkedSlugs.add(r.hotel_deluxe);
    if (r.hotel_luxury) linkedSlugs.add(r.hotel_luxury);
  }
  if (linkedSlugs.size === 0) return [];

  const { data, error } = await supabase
    .from("hotels")
    .select("tier, price_per_night, slug")
    .in("slug", Array.from(linkedSlugs));
  if (error) throw new Error(`loadHotelTierSummaries hotels: ${error.message}`);
  const rows = ((data ?? []) as Array<{ tier: string; price_per_night: number | null }>)
    .filter((r) => r.price_per_night && r.price_per_night > 0);
  const byTier = new Map<string, number[]>();
  for (const r of rows) {
    const arr = byTier.get(r.tier) ?? [];
    arr.push(r.price_per_night!);
    byTier.set(r.tier, arr);
  }
  const out: HotelTierSummary[] = [];
  for (const tier of ["deluxe", "premium", "luxury"]) {
    const arr = byTier.get(tier) ?? [];
    if (arr.length === 0) {
      out.push({ tier, hotels: 0, avgPrice: 0, minPrice: 0, maxPrice: 0 });
    } else {
      out.push({
        tier,
        hotels: arr.length,
        avgPrice: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
        minPrice: Math.min(...arr),
        maxPrice: Math.max(...arr),
      });
    }
  }
  return out;
}

export const dynamic = "force-dynamic";

async function loadSkarduPackages(): Promise<PackagePickerEntry[]> {
  const supabase = getSupabaseAdmin();
  // Picker now exposes every published package — Skardu fly-in still gets the
  // NCP-Prado treatment in the engine, road packages run the normal picker.
  const { data, error } = await supabase
    .from("packages")
    .select("slug, name, duration, starting_cities")
    .eq("published", true)
    .order("name");
  if (error) throw new Error(`loadSkarduPackages: ${error.message}`);
  return ((data ?? []) as Array<{
    slug: string;
    name: string;
    duration: number;
    starting_cities: string[];
  }>).map((r) => ({
    slug: r.slug,
    name: r.name,
    duration: r.duration,
    startingCities: r.starting_cities ?? [],
  }));
}

export default async function CostCalculatorPage() {
  await requireAdmin();
  const [skarduPackages, vehicles, engineConfig, hotelTiers, allHotels] = await Promise.all([
    loadSkarduPackages(),
    listVehicleTypes(),
    getEngineConfig(),
    loadHotelTierSummaries(),
    loadAllPackageLinkedHotels(),
  ]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Cost Calculator
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Quote builder — transport, hotel, guide, flight. Vehicle rates managed on{" "}
          <a href="/admin/vehicles" style={{ color: "var(--accent-primary)", textDecoration: "underline" }}>
            /admin/vehicles
          </a>.
        </p>
      </div>

      <CostCalculator
        skarduPackages={skarduPackages}
        vehicles={vehicles}
        engineConfig={engineConfig}
        hotelTiers={hotelTiers}
        allHotels={allHotels}
      />
    </div>
  );
}
