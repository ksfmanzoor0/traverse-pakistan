import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  name: z.string().min(2).max(120),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Name must be 2–120 characters" }, { status: 400 });

  const { name } = body.data;
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (ref.startsWith("PKG-")) {
    await supabase.from("package_bookings").update({ contact_name: name, updated_at: now }).eq("booking_ref", ref);
  } else if (ref.startsWith("HTL-")) {
    await supabase.from("hotel_bookings").update({ contact_name: name, updated_at: now }).eq("booking_ref", ref);
  } else {
    await supabase.from("bookings").update({ contact_name: name, updated_at: now }).eq("booking_ref", ref);
  }

  return NextResponse.json({ updated: true });
}
