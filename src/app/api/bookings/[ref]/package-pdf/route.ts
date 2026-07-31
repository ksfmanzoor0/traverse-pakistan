import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getPackageBySlug, getPackageItinerary } from "@/services/package.service";
import { getAllHotels } from "@/services/hotel.service";
import { generatePackageItineraryPdf, type PdfBookingContext } from "@/lib/packages/generatePackageItineraryPdf";
import type { PackageTier } from "@/types/package";
import type { PackageBookingSnapshot } from "@/types/packageBookingSnapshot";

export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const supabase = getSupabaseAdmin();
  type BookingRow = {
    booking_ref: string;
    package_slug: string;
    tier: string;
    departure_city: string | null;
    start_date: string | null;
    adults: number | null;
    rooms: number | null;
    contact_name: string | null;
    itinerary_snapshot: PackageBookingSnapshot | null;
  };
  const { data, error } = await supabase
    .from("package_bookings")
    .select("booking_ref, package_slug, tier, departure_city, start_date, adults, rooms, contact_name, itinerary_snapshot")
    .eq("booking_ref", ref)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = data as unknown as BookingRow;

  const [pkg, itinerary, hotels] = await Promise.all([
    getPackageBySlug(row.package_slug),
    getPackageItinerary(row.package_slug),
    getAllHotels(),
  ]);
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const hotelsBySlug = new Map(hotels.map((h) => [h.slug, h]));
  const booking: PdfBookingContext = {
    bookingRef: row.booking_ref,
    contactName: row.contact_name,
    tier: (row.tier as PackageTier) ?? "deluxe",
    departureCity: row.departure_city ?? "islamabad",
    startDate: row.start_date,
    adults: row.adults ?? 1,
    rooms: row.rooms ?? 1,
    snapshot: (row.itinerary_snapshot as PackageBookingSnapshot | null) ?? null,
  };
  const pdf = await generatePackageItineraryPdf({ pkg, itinerary, hotelsBySlug, booking });

  const safeName = pkg.name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").slice(0, 80);
  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-${row.booking_ref}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
