import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { quotePackage, type Tier } from "@/services/package-quote.service";
import type { HomeCity } from "@/services/addon-cost.service";

/**
 * Recomputes every package's engine quote and writes the result into
 * `packages.pricing` (the engine snapshot). Triggered by Vercel Cron just
 * after the 12h flight scraper completes, so the snapshot is always within
 * a few minutes of the freshest available fare data.
 *
 * The snapshot is the canonical listing/SEO/first-paint price. Operator pins
 * live in `packages.pricing_override` and are NOT touched here — they win
 * over the snapshot in the read path (see `mergePricing` in package.service).
 *
 * Auth: Bearer token in Authorization header must equal CRON_SECRET. Set the
 * same value in Vercel's cron config so Vercel signs requests for us.
 */
const HOMES: HomeCity[] = ["ISB", "LHE", "KHI"];
const TIERS: Tier[] = ["deluxe", "luxury"];
const HOME_TO_CITY: Record<HomeCity, "islamabad" | "lahore" | "karachi"> = {
  ISB: "islamabad",
  LHE: "lahore",
  KHI: "karachi",
};

const CANONICAL_PAX = 2;

function canonicalStartDate(): string {
  // 30 days out — far enough that flight scrapes have coverage, close enough
  // that the price isn't a moonshot. Same default the calculator picker uses.
  const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

interface PackageRepriceResult {
  slug: string;
  written: number;
  skipped: Array<{ tier: Tier; home: HomeCity; reason: string }>;
}

async function authorize(req: Request): Promise<NextResponse | null> {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

async function repriceOne(
  slug: string,
  startDate: string,
): Promise<PackageRepriceResult> {
  const supabase = getSupabaseAdmin();
  const { data: pkg, error } = await supabase
    .from("packages")
    .select("pricing")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`load ${slug}: ${error.message}`);
  if (!pkg) throw new Error(`Package ${slug} not found`);

  const current = (pkg.pricing as Record<string, Record<string, number | null>> | null) ?? {};
  const next: Record<string, Record<string, number | null>> = { ...current };
  const skipped: PackageRepriceResult["skipped"] = [];
  let written = 0;

  for (const tier of TIERS) {
    const tierBlock = { ...(next[tier] ?? {}) };
    for (const home of HOMES) {
      const quote = await quotePackage({
        slug,
        home,
        tier,
        pax: CANONICAL_PAX,
        startDate,
      });
      if (!quote) {
        skipped.push({ tier, home, reason: "engine returned null" });
        continue;
      }
      if (quote.unresolved.length > 0) {
        skipped.push({ tier, home, reason: quote.unresolved.join("; ") });
        continue;
      }
      if (!Number.isFinite(quote.perPerson) || quote.perPerson <= 0) {
        skipped.push({ tier, home, reason: `non-positive perPerson (${quote.perPerson})` });
        continue;
      }
      tierBlock[HOME_TO_CITY[home]] = quote.perPerson;
      written += 1;
    }
    if (Object.keys(tierBlock).length > 0) next[tier] = tierBlock;
  }

  const { error: writeErr } = await supabase
    .from("packages")
    .update({ pricing: next })
    .eq("slug", slug);
  if (writeErr) throw new Error(`write ${slug}: ${writeErr.message}`);

  return { slug, written, skipped };
}

async function runReprice() {
  const supabase = getSupabaseAdmin();
  const { data: pkgs, error } = await supabase
    .from("packages")
    .select("slug, duration");
  if (error) throw new Error(`list packages: ${error.message}`);

  const startDate = canonicalStartDate();
  const results: PackageRepriceResult[] = [];
  const failures: Array<{ slug: string; error: string }> = [];

  // Sequential rather than parallel: each package fires ~6 engine quotes which
  // each fetch hotels + flights + vehicles. Bursting all 56 packages at once
  // would punish Supabase quotas for no real gain since this only runs twice
  // a day.
  for (const p of (pkgs ?? []) as Array<{ slug: string }>) {
    try {
      results.push(await repriceOne(p.slug, startDate));
    } catch (err) {
      failures.push({ slug: p.slug, error: (err as Error).message });
    }
  }

  // Bust both caches so visitors see the new snapshot on the next request
  // instead of waiting for TTL. `packages` covers card / listing / SEO /
  // first-paint reads; `package-quote` covers the sidebar's engine fetch.
  revalidateTag("packages", {});
  revalidateTag("package-quote", {});

  return { startDate, processed: results.length, results, failures };
}

export async function POST(req: Request) {
  const denial = await authorize(req);
  if (denial) return denial;
  try {
    const summary = await runReprice();
    return NextResponse.json(summary);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// GET is supported so Vercel Cron's preferred GET trigger and a manual curl
// both work. Same auth either way.
export async function GET(req: Request) {
  return POST(req);
}
