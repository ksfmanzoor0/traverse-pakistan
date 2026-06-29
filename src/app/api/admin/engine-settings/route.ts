import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { updateEngineConfig } from "@/services/vehicle.service";
import { repriceAllPackages } from "@/services/package-quote.service";

/**
 * POST writes global engine_config and reprices the whole catalog. Per-package
 * overrides (fuel_price_per_litre, profit_percentage, guide_per_day on the
 * packages table) WIN over these globals — see save-engine-inputs route + the
 * `pkg.X ?? engineConfig.X` resolver in package-quote.service.ts. Use the
 * `/api/admin/engine-settings/reset-overrides` endpoint to clear overrides if
 * you want a global change to propagate to every package.
 */
export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => null) as {
    fuelPricePerLitre?: number;
    profitPercentage?: number;
    packageBufferKm?: number;
    lheExtensionKm?: number;
    guidePerDay?: number;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: `${key} must be a finite number >= 0` }, { status: 400 });
    }
  }

  await updateEngineConfig(body);
  const summary = await repriceAllPackages();
  revalidateTag("packages", {});
  revalidateTag("package-quote", {});

  return NextResponse.json({
    applied: body,
    reprice: { processed: summary.processed, failures: summary.failures.length },
  });
}
