import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getHotelBySlug } from "@/services/hotel.service";
import {
  generateHotelReservationPdf,
  type HotelPdfRoom,
} from "@/lib/hotels/generateHotelReservationPdf";

type HotelBookingRow = {
  id: string;
  booking_ref: string;
  hotel_slug: string;
  checkin_date: string;
  checkout_date: string;
  nights: number;
  adults: number;
  children: number;
  total_amount: number | string;
  currency: string;
  booking_status: string | null;
  payment_status: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  arrival_time: string | null;
  notes: string | null;
  reservation_code: string | null;
};

type RoomRow = {
  room_name: string;
  qty: number;
  adults: number;
  children: number;
  price_per_night: number | string;
};

export async function GET(_req: Request, { params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const supabase = getSupabaseAdmin();

  const { data: booking } = await supabase
    .from("hotel_bookings")
    .select(
      "id, booking_ref, hotel_slug, checkin_date, checkout_date, nights, adults, children, total_amount, currency, booking_status, payment_status, contact_name, contact_email, contact_phone, arrival_time, notes, reservation_code",
    )
    .eq("booking_ref", ref)
    .maybeSingle();

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = booking as unknown as HotelBookingRow;

  const [roomsRes, hotel] = await Promise.all([
    supabase
      .from("hotel_booking_rooms" as never)
      .select("room_name, qty, adults, children, price_per_night")
      .eq("booking_id", row.id),
    getHotelBySlug(row.hotel_slug),
  ]);

  const rooms: HotelPdfRoom[] = (
    (roomsRes.data as unknown as RoomRow[] | null) ?? []
  ).map((r) => ({
    roomName: r.room_name,
    qty: r.qty,
    adults: r.adults,
    children: r.children,
    pricePerNight: Number(r.price_per_night),
  }));

  const pdf = await generateHotelReservationPdf({
    bookingRef: row.booking_ref,
    reservationCode: row.reservation_code,
    bookingStatus: row.booking_status ?? "pending",
    paymentStatus: row.payment_status ?? "pending",
    hotelName: hotel?.name ?? row.hotel_slug,
    hotelLocation: hotel?.destinationSlug
      ? hotel.destinationSlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
      : null,
    destinationSlug: hotel?.destinationSlug ?? null,
    checkinDate: row.checkin_date,
    checkoutDate: row.checkout_date,
    nights: row.nights,
    arrivalTime: row.arrival_time,
    contactName: row.contact_name,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    adults: row.adults,
    children: row.children,
    rooms,
    totalAmount: Number(row.total_amount),
    currency: row.currency ?? "PKR",
    notes: row.notes,
  });

  const safeHotel = (hotel?.name ?? row.hotel_slug)
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 60);

  return new NextResponse(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Reservation-${safeHotel}-${row.booking_ref}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
