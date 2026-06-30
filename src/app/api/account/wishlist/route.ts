/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";

// `wishlists` isn't in the generated Database types yet — local `any` casts on
// the query builder keep this typed loosely until types are regenerated. The
// shape is enforced by the schema below and the SQL constraints (CHECK +
// composite PK + RLS).

const itemSchema = z.object({
  itemType: z.enum(["tour", "package", "hotel"]),
  itemSlug: z.string().min(1).max(120),
});

// GET /api/account/wishlist → list current user's wishlist items
export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data, error } = await (supabase.from("wishlists" as never) as any)
    .select("item_type, item_slug, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}

// POST /api/account/wishlist → add an item
// Body: { itemType, itemSlug }
export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = itemSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid item" }, { status: 400 });

  // Composite PK on (user_id, item_type, item_slug) makes this idempotent.
  const { error } = await (supabase.from("wishlists" as never) as any).upsert({
    user_id: user.id,
    item_type: parsed.data.itemType,
    item_slug: parsed.data.itemSlug,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE /api/account/wishlist → remove an item
// Body: { itemType, itemSlug }
export async function DELETE(req: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user;
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = itemSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid item" }, { status: 400 });

  const { error } = await (supabase.from("wishlists" as never) as any)
    .delete()
    .eq("user_id", user.id)
    .eq("item_type", parsed.data.itemType)
    .eq("item_slug", parsed.data.itemSlug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
