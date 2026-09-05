import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Server-side booking creation for hotels. Moving the create_hotel_booking
// RPC call behind this route lets us revoke public EXECUTE on the RPC —
// without this indirection, anyone with the anon key could POST directly to
// /rest/v1/rpc/create_hotel_booking with arbitrary input.
//
// Server-side line-item re-quote is intentionally NOT wired here yet; that
// lands in a follow-up. This route mirrors the exact behavior of the previous
// client call so the migration is surgical.

interface HotelBookingLineItem {
  roomName: string;
  qty: number;
  adults: number;
  children: number;
  pricePerNight: number;
}

interface CreateBody {
  hotelSlug: string;
  lineItems: HotelBookingLineItem[];
  checkinDate: string | null;
  checkoutDate: string | null;
  adults: number;
  children: number;
  nights: number;
  totalAmount: number;
  contact: { name: string; email: string; phone: string };
  arrivalTime?: string;
  notes?: string;
  submitUuid?: string;
}

export async function POST(req: NextRequest) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (
    !body.hotelSlug ||
    !Array.isArray(body.lineItems) || body.lineItems.length === 0 ||
    !body.contact?.name ||
    !body.contact?.email ||
    !body.contact?.phone ||
    !(body.nights > 0) ||
    !(body.totalAmount > 0)
  ) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase.rpc("create_hotel_booking" as never, {
    p_hotel_slug: body.hotelSlug,
    p_checkin_date: body.checkinDate ?? null,
    p_checkout_date: body.checkoutDate ?? null,
    p_adults: body.adults,
    p_children: body.children,
    p_nights: body.nights,
    p_total_amount: body.totalAmount,
    p_contact_name: body.contact.name,
    p_contact_email: body.contact.email,
    p_contact_phone: body.contact.phone,
    p_arrival_time: body.arrivalTime ?? null,
    p_notes: body.notes ?? null,
    p_line_items: body.lineItems,
    p_submit_uuid: body.submitUuid ?? null,
  } as never);

  if (error) {
    console.error("[api/hotels/create-booking] rpc failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

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
