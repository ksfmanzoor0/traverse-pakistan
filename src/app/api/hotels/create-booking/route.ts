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

  // Minimal shape check — RPC does its own field validation and returns a
  // proper error message on bad input.
  if (!body.hotelSlug || !body.contact?.name) {
    console.error("[api/hotels/create-booking] rejected 400 with body:", JSON.stringify(body));
    return NextResponse.json(
      { error: "missing required fields", missing: { hotelSlug: !body.hotelSlug, contactName: !body.contact?.name } },
      { status: 400 },
    );
  }

  try {
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
      return NextResponse.json({ error: `rpc: ${error.message}`, code: error.code, details: error.details, hint: error.hint }, { status: 500 });
    }

    const result = Array.isArray(data)
      ? (data[0] as { booking_id: string; booking_ref: string; total_amount: number })
      : null;
    if (!result) {
      console.error("[api/hotels/create-booking] rpc returned empty:", data);
      return NextResponse.json({ error: "no booking returned" }, { status: 500 });
    }

    return NextResponse.json({
      bookingId: result.booking_id,
      bookingRef: result.booking_ref,
      totalAmount: result.total_amount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[api/hotels/create-booking] uncaught:", message, stack);
    return NextResponse.json({ error: `uncaught: ${message}` }, { status: 500 });
  }
}
