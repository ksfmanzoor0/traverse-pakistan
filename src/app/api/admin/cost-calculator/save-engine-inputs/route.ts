import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { repricePackageBySlug } from "@/services/package-quote.service";

interface JeepLeg {
  name: string;
  costPerJeep: number;
  capacity: number;
}

function sanitizeJeepLegs(input: unknown): JeepLeg[] | { error: string } {
  if (!Array.isArray(input)) return { error: "jeep_legs must be an array" };
  const out: JeepLeg[] = [];
  for (const raw of input) {
    if (typeof raw !== "object" || raw === null) return { error: "jeep_legs entries must be objects" };
    const r = raw as Record<string, unknown>;
    const name = typeof r.name === "string" ? r.name.trim() : "";
    const cost = Number(r.costPerJeep);
    const cap = Number(r.capacity);
    if (!name) return { error: "jeep leg name is required" };
    if (!Number.isFinite(cost) || cost < 0) return { error: `invalid costPerJeep for "${name}"` };
    if (!Number.isFinite(cap) || cap < 1) return { error: `invalid capacity for "${name}"` };
    out.push({ name, costPerJeep: Math.round(cost), capacity: Math.floor(cap) });
  }
  return out;
}

/**
 * POST writes per-package engine inputs (`meals_per_person`, `entries_per_person`,
 * `jeep_legs`, `total_distance_km`, `fuel_price_per_litre`, `profit_percentage`,
 * `guide_per_day`) for a single package, then reprices ONLY that package so
 * `packages.pricing` reflects the new inputs immediately. Per-package overrides
 * have no cross-package effect, so a full-catalog reprice would be wasted work.
 *
 * Body: { slug, meals_per_person?, entries_per_person?, jeep_legs?,
 *         total_distance_km?, fuel_price_per_litre?, profit_percentage?, guide_per_day? }
 * Any omitted field leaves the existing DB value untouched. Pass `null`
 * explicitly to clear an override back to the global engine_config default.
 */
export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => null) as {
    slug?: string;
    meals_per_person?: number;
    entries_per_person?: number;
    jeep_legs?: unknown;
    total_distance_km?: number | null;
    fuel_price_per_litre?: number | null;
    profit_percentage?: number | null;
    guide_per_day?: number | null;
  } | null;

  if (!body?.slug) {
    return NextResponse.json({ error: "Required: slug" }, { status: 400 });
  }

  const patch: {
    meals_per_person?: number;
    entries_per_person?: number;
    jeep_legs?: JeepLeg[];
    total_distance_km?: number;
    fuel_price_per_litre?: number | null;
    profit_percentage?: number | null;
    guide_per_day?: number | null;
  } = {};
  if (body.meals_per_person !== undefined) {
    const n = Number(body.meals_per_person);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "meals_per_person must be >= 0" }, { status: 400 });
    patch.meals_per_person = Math.round(n);
  }
  if (body.entries_per_person !== undefined) {
    const n = Number(body.entries_per_person);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: "entries_per_person must be >= 0" }, { status: 400 });
    patch.entries_per_person = Math.round(n);
  }
  if (body.jeep_legs !== undefined) {
    const legs = sanitizeJeepLegs(body.jeep_legs);
    if ("error" in legs) return NextResponse.json({ error: legs.error }, { status: 400 });
    patch.jeep_legs = legs;
  }
  if (body.total_distance_km !== undefined && body.total_distance_km !== null) {
    const n = Number(body.total_distance_km);
    if (!Number.isFinite(n) || n <= 0) return NextResponse.json({ error: "total_distance_km must be > 0" }, { status: 400 });
    patch.total_distance_km = Math.round(n);
  }
  // For the three engine-config-inheritable fields, `null` clears the override
  // (package falls back to global engine_config); a finite number pins it.
  for (const [bodyKey, patchKey] of [
    ["fuel_price_per_litre", "fuel_price_per_litre"],
    ["profit_percentage", "profit_percentage"],
    ["guide_per_day", "guide_per_day"],
  ] as const) {
    const v = body[bodyKey];
    if (v === undefined) continue;
    if (v === null) { patch[patchKey] = null; continue; }
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return NextResponse.json({ error: `${bodyKey} must be >= 0 or null to inherit global` }, { status: 400 });
    patch[patchKey] = n;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No engine inputs supplied" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error: writeErr } = await supabase
    .from("packages")
    .update(patch)
    .eq("slug", body.slug);
  if (writeErr) return NextResponse.json({ error: writeErr.message }, { status: 500 });

  const result = await repricePackageBySlug(body.slug);
  revalidateTag("packages", {});
  revalidateTag("package-quote", {});

  return NextResponse.json({ slug: body.slug, applied: patch, reprice: result });
}
