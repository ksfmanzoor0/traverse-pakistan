import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type Tier = "deluxe" | "luxury" | "premium";
type Home = "ISB" | "LHE" | "KHI";

const HOME_TO_PRICING_KEY: Record<Home, "islamabad" | "lahore" | "karachi"> = {
  ISB: "islamabad",
  LHE: "lahore",
  KHI: "karachi",
};

function isHome(v: string): v is Home {
  return v === "ISB" || v === "LHE" || v === "KHI";
}
function isTier(v: string): v is Tier {
  return v === "deluxe" || v === "luxury" || v === "premium";
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => null) as {
    slug?: string;
    home?: string;
    tier?: string;
    perPerson?: number;
  } | null;

  if (!body || !body.slug || !body.home || !body.tier || typeof body.perPerson !== "number") {
    return NextResponse.json({ error: "Required: slug, home, tier, perPerson" }, { status: 400 });
  }
  if (!isHome(body.home)) return NextResponse.json({ error: "home must be ISB|LHE|KHI" }, { status: 400 });
  if (!isTier(body.tier)) return NextResponse.json({ error: "tier must be deluxe|luxury|premium" }, { status: 400 });
  if (!Number.isFinite(body.perPerson) || body.perPerson <= 0) {
    return NextResponse.json({ error: "perPerson must be > 0" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const cityKey = HOME_TO_PRICING_KEY[body.home];
  const rounded = Math.round(body.perPerson);

  const { data: pkg, error: readErr } = await supabase
    .from("packages")
    .select("pricing")
    .eq("slug", body.slug)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const pricing = (pkg.pricing as Record<string, Record<string, number | null>> | null) ?? {};
  const previous = pricing[body.tier]?.[cityKey] ?? null;
  pricing[body.tier] = { ...(pricing[body.tier] ?? {}), [cityKey]: rounded };

  const { error: writeErr } = await supabase
    .from("packages")
    .update({ pricing })
    .eq("slug", body.slug);
  if (writeErr) return NextResponse.json({ error: writeErr.message }, { status: 500 });

  return NextResponse.json({
    slug: body.slug,
    tier: body.tier,
    city: cityKey,
    value: rounded,
    previous,
  });
}
