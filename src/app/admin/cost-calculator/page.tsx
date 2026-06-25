import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { listVehicleTypes } from "@/services/vehicle.service";
import { CostCalculator, type PackagePickerEntry } from "@/components/admin/cost-calculator/CostCalculator";

export const dynamic = "force-dynamic";

async function loadSkarduPackages(): Promise<PackagePickerEntry[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("packages")
    .select("slug, name, duration, starting_cities")
    .contains("starting_cities", ["KDU"])
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
  const [skarduPackages, vehicles] = await Promise.all([
    loadSkarduPackages(),
    listVehicleTypes(),
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

      <CostCalculator skarduPackages={skarduPackages} vehicles={vehicles} />
    </div>
  );
}
