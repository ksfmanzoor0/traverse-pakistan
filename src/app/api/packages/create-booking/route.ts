import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Server-side booking creation for packages. Routing the create_package_booking
// RPC call through this endpoint lets us revoke public EXECUTE on the RPC —
// without this indirection anyone with the anon key could POST directly to
// /rest/v1/rpc/create_package_booking.

interface CreateBody {
  packageSlug: string;
  tier: "deluxe" | "luxury" | "premium";
  departureCity: string;
  startDate: string | null;
  adults: number;
  rooms: number;
  totalAmount: number;
  contact: { name: string; email: string; phone: string };
  notes?: string;
  submitUuid?: string;
  paymentPlan?: "full" | "installments";
}

export async function POST(req: NextRequest) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.packageSlug || !body.contact?.name) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("create_package_booking" as never, {
    p_package_slug: body.packageSlug,
    p_tier: body.tier,
    p_departure_city: body.departureCity,
    p_start_date: body.startDate ?? null,
    p_adults: body.adults,
    p_rooms: body.rooms,
    p_total_amount: body.totalAmount,
    p_contact_name: body.contact.name,
    p_contact_email: body.contact.email,
    p_contact_phone: body.contact.phone,
    p_notes: body.notes ?? null,
    p_submit_uuid: body.submitUuid ?? null,
    p_payment_plan: body.paymentPlan ?? "full",
  } as never);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = Array.isArray(data)
    ? (data[0] as { booking_id: string; booking_ref: string; total_amount: number })
    : null;
  if (!result) return NextResponse.json({ error: "no booking returned" }, { status: 500 });

  return NextResponse.json({
    bookingId: result.booking_id,
    bookingRef: result.booking_ref,
    totalAmount: result.total_amount,
  });
}
