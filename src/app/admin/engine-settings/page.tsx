import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getEngineConfig } from "@/services/vehicle.service";
import { EngineSettingsForm } from "@/components/admin/engine-settings/EngineSettingsForm";

export const dynamic = "force-dynamic";

async function countPackagesWithOverrides(): Promise<number> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("packages")
    .select("slug", { count: "exact", head: true })
    .or("fuel_price_per_litre.not.is.null,profit_percentage.not.is.null,guide_per_day.not.is.null");
  if (error) throw new Error(`countPackagesWithOverrides: ${error.message}`);
  return count ?? 0;
}

export default async function EngineSettingsPage() {
  await requireAdmin();
  const [config, overriddenPackageCount] = await Promise.all([
    getEngineConfig(),
    countPackagesWithOverrides(),
  ]);

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        Engine settings
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Global defaults read by the pricing engine when a package has no override.
        Saving here reprices every package; packages with a pinned per-package value
        keep their override. Use the reset button to force a global change to propagate.
      </p>

      <div
        className="mt-8 rounded-2xl p-6"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <EngineSettingsForm initial={config} overriddenPackageCount={overriddenPackageCount} />
      </div>
    </div>
  );
}
