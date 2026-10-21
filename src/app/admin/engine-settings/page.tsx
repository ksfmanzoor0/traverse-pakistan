import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getEngineConfig } from "@/services/vehicle.service";
import { EngineSettingsForm } from "@/components/admin/engine-settings/EngineSettingsForm";

export const dynamic = "force-dynamic";

export interface OverriddenPackage {
  slug: string;
  name: string;
  fuelPricePerLitre: number | null;
  profitPercentage: number | null;
  guidePerDay: number | null;
}

async function listPackagesWithOverrides(): Promise<OverriddenPackage[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("packages")
    .select("slug, name, fuel_price_per_litre, profit_percentage, guide_per_day")
    .or("fuel_price_per_litre.not.is.null,profit_percentage.not.is.null,guide_per_day.not.is.null")
    .order("name", { ascending: true });
  if (error) throw new Error(`listPackagesWithOverrides: ${error.message}`);
  return (data ?? []).map((r) => ({
    slug: r.slug as string,
    name: r.name as string,
    fuelPricePerLitre: (r.fuel_price_per_litre as number | null) ?? null,
    profitPercentage: (r.profit_percentage as number | null) ?? null,
    guidePerDay: (r.guide_per_day as number | null) ?? null,
  }));
}

export default async function EngineSettingsPage() {
  await requireAdmin();
  const [config, overriddenPackages] = await Promise.all([
    getEngineConfig(),
    listPackagesWithOverrides(),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        Engine settings
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Global defaults read by the pricing engine when a package has no override.
        Saving here reprices every package; packages with a pinned per-package value
        keep their override. Reset individually below or in bulk to force a global
        change to propagate.
      </p>

      <div
        className="mt-8 rounded-2xl p-6"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <EngineSettingsForm initial={config} overriddenPackages={overriddenPackages} />
      </div>
    </div>
  );
}
