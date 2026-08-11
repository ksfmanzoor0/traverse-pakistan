import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { quoteTourAddons, type HomeCity } from "@/services/addon-cost.service";

export const dynamic = "force-dynamic";

// Server-side booking creation for tours that carry flight/bus addons.
// The client cannot be trusted to compute the addon amount, so we re-quote
// here and forward the trusted total to the create_booking RPC. Non-addon
// tours should keep using the direct client RPC path in booking.service.ts.
interface CreateBody {
  departureId: string;
  seats: number;
  singleRooms: number;
  contact: { name: string; email: string; phone: string };
  participants: Array<{
    fullName?: string;
    cnicOrPassport?: string;
    dateOfBirth?: string;
    dietary?: string;
    emergencyContact?: string;
  }>;
  notes?: string;
  submitUuid?: string;
  paymentPlan?: "full" | "installments";
  homeCity: HomeCity;
  // IDs of tour_addons rows the user has selected. When absent, we fall back
  // to the "baseline" (required + optional-default-on). Server re-resolves
  // and validates every ID against the tour's actual addon list — client
  // cannot spoof unknown IDs or bypass required addons.
  selectedAddonIds?: string[];
}

export async function POST(req: NextRequest) {
  let body: CreateBody;
  try {
    body = (await req.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.departureId || !body.seats || !body.contact?.name || !body.homeCity) {
    return NextResponse.json({ error: "missing required fields" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: depRow, error: depErr } = await supabase
    .from("departures")
    .select("tour_slug, departure_date")
    .eq("id", body.departureId)
    .maybeSingle();
  if (depErr || !depRow) {
    return NextResponse.json({ error: "departure not found" }, { status: 404 });
  }
  const dep = depRow as { tour_slug: string; departure_date: string };

  const quote = await quoteTourAddons({
    tourSlug: dep.tour_slug,
    homeCity: body.homeCity,
    startDate: dep.departure_date,
  });
  if (!quote) return NextResponse.json({ error: "tour not found" }, { status: 404 });

  // Enforce required addons always ship in the total. Optional addons only
  // fire when the client passes their ID. Unknown IDs are silently dropped.
  const validIds = new Set(quote.addons.map((a) => a.addonId));
  const clientPicked = new Set((body.selectedAddonIds ?? []).filter((id) => validIds.has(id)));
  const finalAddons = quote.addons.filter((a) => a.isRequired || clientPicked.has(a.addonId));
  const addonCostPerPerson = finalAddons.reduce((s, a) => s + a.perPerson, 0);
  const addonAmountTotal = addonCostPerPerson * body.seats;

  const { data, error } = await supabase.rpc("create_booking" as never, {
    p_departure_id: body.departureId,
    p_seats: body.seats,
    p_single_rooms: body.singleRooms,
    p_contact_name: body.contact.name,
    p_contact_email: body.contact.email,
    p_contact_phone: body.contact.phone,
    p_participants: body.participants.map((p) => ({
      full_name: p.fullName ?? "",
      cnic_or_passport: p.cnicOrPassport ?? null,
      date_of_birth: p.dateOfBirth ?? null,
      dietary: p.dietary ?? null,
      emergency_contact: p.emergencyContact ?? null,
    })),
    p_notes: body.notes ?? null,
    p_submit_uuid: body.submitUuid ?? null,
    p_payment_plan: body.paymentPlan ?? "full",
    p_home_city: body.homeCity,
    p_addon_amount_total: addonAmountTotal,
    p_resolved_addons: JSON.parse(JSON.stringify({
      homeCity: quote.homeCity,
      perPerson: addonCostPerPerson,
      addons: finalAddons,
    })),
  } as never);

  if (error) {
    console.error("[api/tours/create-booking] rpc failed:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = Array.isArray(data) ? (data[0] as { booking_id: string; booking_ref: string; total_amount: number }) : null;
  if (!result) return NextResponse.json({ error: "no booking returned" }, { status: 500 });

  return NextResponse.json({
    bookingId: result.booking_id,
    bookingRef: result.booking_ref,
    totalAmount: result.total_amount,
  });
}
