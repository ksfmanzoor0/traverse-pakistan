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
    // Detach any unpaid promo code so the user can reuse it on a new
    // booking. Paid bookings keep the audit trail (used_at on the code row
    // is already set, so the code is dead regardless).
    const { data: pkgRow } = await supabase
      .from("package_bookings")
      .select("promo_code, payment_status")
      .eq("booking_ref", ref)
      .maybeSingle();
    const pkg = pkgRow as unknown as { promo_code: string | null; payment_status: string | null } | null;
    const detachPromo = pkg?.promo_code && !["paid", "deposit_paid"].includes(pkg.payment_status ?? "");

    const { error } = await supabase
      .from("package_bookings")
      .update({
        booking_status: "cancelled",
        status: "cancelled",
        updated_at: now,
        ...(detachPromo ? { promo_code: null, promo_discount_amount: null } : {}),
      } as never)
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
