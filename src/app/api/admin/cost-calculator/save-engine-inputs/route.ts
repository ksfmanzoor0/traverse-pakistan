import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { repriceAllPackages } from "@/services/package-quote.service";

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
 * POST writes engine-input columns (`meals_per_person`, `entries_per_person`,
 * `jeep_legs`) for a single package, busts the listings + sidebar caches,
 * and kicks off a full reprice so `packages.pricing` reflects the new inputs
 * immediately rather than waiting for the next nightly cron run.
 *
 * Body: { slug, meals_per_person?, entries_per_person?, jeep_legs? }
 * Any field omitted leaves the existing DB value untouched.
 */
export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => null) as {
    slug?: string;
    meals_per_person?: number;
    entries_per_person?: number;
    jeep_legs?: unknown;
  } | null;

  if (!body?.slug) {
    return NextResponse.json({ error: "Required: slug" }, { status: 400 });
  }

  const patch: {
    meals_per_person?: number;
    entries_per_person?: number;
    jeep_legs?: JeepLeg[];
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
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No engine inputs supplied" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error: writeErr } = await supabase
    .from("packages")
    .update(patch)
    .eq("slug", body.slug);
  if (writeErr) return NextResponse.json({ error: writeErr.message }, { status: 500 });

  // Reprice so the new inputs flow into `packages.pricing` immediately, then
  // bust both caches. Repricing the whole catalog is cheap (bounded concurrency)
  // and keeps engine-driven listings in sync without per-slug plumbing.
  const summary = await repriceAllPackages();
  revalidateTag("packages", {});
  revalidateTag("package-quote", {});

  return NextResponse.json({ slug: body.slug, applied: patch, reprice: { processed: summary.processed, failures: summary.failures.length } });
}
