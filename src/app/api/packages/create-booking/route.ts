import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Server-side booking creation for packages. Moving the create_package_booking
// RPC call behind this route lets us revoke public EXECUTE on the RPC —
// without this indirection, anyone with the anon key could POST directly to
// /rest/v1/rpc/create_package_booking with arbitrary input.
//
// Server-side price re-quote (via quotePackage) is intentionally NOT wired
// here yet; that lands in a follow-up. This route mirrors the exact behavior
// of the previous client call so the migration is surgical.

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

  // Minimal top-level shape check only — the SQL RPC has its own validation
  // and returns a proper error message. Match the tour route's minimalist
  // pattern so we don't accidentally reject valid edge cases.
  if (!body.packageSlug || !body.contact?.name) {
    console.error("[api/packages/create-booking] rejected 400 with body:", JSON.stringify(body));
    return NextResponse.json(
      { error: "missing required fields", missing: { packageSlug: !body.packageSlug, contactName: !body.contact?.name } },
      { status: 400 },
    );
  }

  try {
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

    if (error) {
      console.error("[api/packages/create-booking] rpc failed:", error);
      return NextResponse.json({ error: `rpc: ${error.message}`, code: error.code, details: error.details, hint: error.hint }, { status: 500 });
    }

    const result = Array.isArray(data)
      ? (data[0] as { booking_id: string; booking_ref: string; total_amount: number })
      : null;
    if (!result) {
      console.error("[api/packages/create-booking] rpc returned empty:", data);
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
    console.error("[api/packages/create-booking] uncaught:", message, stack);
    return NextResponse.json({ error: `uncaught: ${message}` }, { status: 500 });
  }
}
