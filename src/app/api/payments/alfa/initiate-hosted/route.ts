import { NextRequest, NextResponse } from "next/server";
import { alfaConfig } from "@/lib/alfa/config";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");

  if (!ref) {
    return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  let amount: number | null = null;

  if (ref.startsWith("PKG-")) {
    const { data } = await supabase
      .from("package_bookings")
      .select("total_amount")
      .eq("booking_ref", ref)
      .maybeSingle();
    amount = data?.total_amount ?? null;
  } else if (ref.startsWith("HTL-")) {
    const { data } = await supabase
      .from("hotel_bookings")
      .select("total_amount")
      .eq("booking_ref", ref)
      .maybeSingle();
    amount = data?.total_amount ?? null;
  } else {
    const { data } = await supabase
      .from("bookings")
      .select("total_amount")
      .eq("booking_ref", ref)
      .maybeSingle();
    amount = data?.total_amount ?? null;
  }

  if (amount === null) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  return NextResponse.json({
    storeId: alfaConfig.storeId,
    transType: "3",
    orderId: ref,
    amount: Number(amount).toFixed(2),
    secretKey: alfaConfig.secretKey,
  });
}
