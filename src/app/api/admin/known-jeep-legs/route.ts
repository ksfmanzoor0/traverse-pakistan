import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface KnownJeepLegRow {
  id: string;
  name: string;
  cost_per_jeep: number;
  capacity: number;
}

export async function GET() {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  // `known_jeep_legs` was added in a migration after the generated types — cast
  // through `unknown` so the typed client stops complaining about the table name.
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      select: (cols: string) => { order: (col: string) => Promise<{ data: KnownJeepLegRow[] | null; error: { message: string } | null }> };
    };
  }).from("known_jeep_legs").select("id, name, cost_per_jeep, capacity").order("name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const legs = ((data ?? []) as KnownJeepLegRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    costPerJeep: r.cost_per_jeep,
    capacity: r.capacity,
  }));
  return NextResponse.json({ legs });
}

export async function POST(req: Request) {
  await requireAdmin();
  const body = await req.json().catch(() => null) as {
    name?: string;
    costPerJeep?: number;
    capacity?: number;
  } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const cost = Number(body?.costPerJeep);
  const cap = Number(body?.capacity);
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  if (!Number.isFinite(cost) || cost < 0) return NextResponse.json({ error: "costPerJeep must be >= 0" }, { status: 400 });
  if (!Number.isFinite(cap) || cap < 1) return NextResponse.json({ error: "capacity must be >= 1" }, { status: 400 });

  const supabase = getSupabaseAdmin();
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => {
      upsert: (row: Record<string, unknown>, opts: { onConflict: string }) => {
        select: (cols: string) => { single: () => Promise<{ data: KnownJeepLegRow | null; error: { message: string } | null }> };
      };
    };
  })
    .from("known_jeep_legs")
    .upsert({ name, cost_per_jeep: Math.round(cost), capacity: Math.floor(cap) }, { onConflict: "name" })
    .select("id, name, cost_per_jeep, capacity")
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message ?? "Insert failed" }, { status: 500 });
  const r = data as KnownJeepLegRow;
  return NextResponse.json({
    leg: { id: r.id, name: r.name, costPerJeep: r.cost_per_jeep, capacity: r.capacity },
  });
}
