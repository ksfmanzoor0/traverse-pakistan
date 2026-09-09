import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { repricePackageBySlug } from "@/services/package-quote.service";

/**
 * POST clears fuel / profit / guide overrides on one specific package
 * (`{ slug }` in body) and reprices just that package. Complements the
 * bulk /reset-overrides endpoint for when ops wants to un-pin one package
 * without touching the others.
 */
export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => null) as { slug?: string } | null;
  const slug = body?.slug?.trim();
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("packages")
    .update({
      fuel_price_per_litre: null,
      profit_percentage: null,
      guide_per_day: null,
    })
    .eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = await repricePackageBySlug(slug);
  revalidateTag("packages", {});
  revalidateTag("package-quote", {});

  return NextResponse.json({
    slug,
    reprice: { written: result.written, skipped: result.skipped.length },
  });
}
