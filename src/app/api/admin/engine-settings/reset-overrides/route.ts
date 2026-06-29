import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { repriceAllPackages } from "@/services/package-quote.service";

/**
 * POST clears per-package engine_config overrides across every package
 * (`fuel_price_per_litre`, `profit_percentage`, `guide_per_day` → null)
 * and reprices the whole catalog. Use when a global engine_config bump
 * needs to propagate to every package, including ones with pinned values.
 *
 * Does NOT touch `total_distance_km` — distance is a real per-package
 * attribute, not an override of a global default.
 */
export async function POST() {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from("packages")
    .update({
      fuel_price_per_litre: null,
      profit_percentage: null,
      guide_per_day: null,
    }, { count: "exact" })
    .or("fuel_price_per_litre.not.is.null,profit_percentage.not.is.null,guide_per_day.not.is.null");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary = await repriceAllPackages();
  revalidateTag("packages", {});
  revalidateTag("package-quote", {});

  return NextResponse.json({
    cleared: count ?? 0,
    reprice: { processed: summary.processed, failures: summary.failures.length },
  });
}
