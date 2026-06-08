import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireBookingOwner } from "@/lib/auth/requireBookingOwner";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;

  const guard = await requireBookingOwner(ref);
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (guard.table === "hotel_bookings") {
    const { error } = await supabase
      .from("hotel_bookings")
      .update({ booking_status: "cancelled", updated_at: now })
      .eq("booking_ref", ref)
      .neq("booking_status", "cancelled");
    if (error) return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  } else if (guard.table === "package_bookings") {
    const { error } = await supabase
      .from("package_bookings")
      .update({ booking_status: "cancelled", status: "cancelled", updated_at: now })
      .eq("booking_ref", ref)
      .neq("booking_status", "cancelled");
    if (error) return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  } else {
    const { error } = await supabase
      .from("bookings")
      .update({ booking_status: "cancelled", status: "cancelled", updated_at: now })
      .eq("booking_ref", ref)
      .neq("booking_status", "cancelled");
    if (error) return NextResponse.json({ error: "Failed to cancel" }, { status: 500 });
  }

  return NextResponse.json({ cancelled: true });
}
