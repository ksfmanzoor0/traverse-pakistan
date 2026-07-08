import { getSupabaseAdmin } from "@/lib/supabase/server";

export type BookingType = "tour" | "package" | "hotel" | "invitation";

export interface UserBookingSummary {
  ref: string;
  type: BookingType;
  title: string; // human-readable: package name, hotel name, tour name
  date: string | null; // ISO date (start_date, checkin_date, departure_date)
  amount: number;
  status: string; // booking_status
  paymentStatus: string;
  createdAt: string;
}

// Fetches every booking across the 3 tables stamped with this user_id.
// Returns a unified summary list sorted by created_at desc.
export async function getBookingsForUser(userId: string): Promise<UserBookingSummary[]> {
  const supabase = getSupabaseAdmin();

  const [pkg, hotel, tour, invitation] = await Promise.all([
    supabase
      .from("package_bookings")
      .select("booking_ref, package_slug, start_date, total_amount, booking_status, payment_status, created_at")
      .eq("user_id", userId),
    supabase
      .from("hotel_bookings")
      .select("booking_ref, hotel_slug, checkin_date, total_amount, booking_status, payment_status, created_at")
      .eq("user_id", userId),
    supabase
      .from("bookings")
      .select("booking_ref, departure_id, total_amount, booking_status, status, created_at")
      .eq("user_id", userId),
    supabase
      .from("invitation_requests" as never)
      .select("ref, status, amount_pkr, arrival_date, embassy_city, created_at")
      .eq("user_id", userId),
  ]);

  const list: UserBookingSummary[] = [];

  for (const row of pkg.data ?? []) {
    list.push({
      ref: row.booking_ref as string,
      type: "package",
      title: String(row.package_slug ?? "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      date: (row.start_date as string | null) ?? null,
      amount: Number(row.total_amount),
      status: String(row.booking_status ?? "pending"),
      paymentStatus: String(row.payment_status ?? "pending"),
      createdAt: String(row.created_at),
    });
  }

  for (const row of hotel.data ?? []) {
    list.push({
      ref: row.booking_ref as string,
      type: "hotel",
      title: String(row.hotel_slug ?? "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      date: (row.checkin_date as string | null) ?? null,
      amount: Number(row.total_amount),
      status: String(row.booking_status ?? "pending"),
      paymentStatus: String(row.payment_status ?? "pending"),
      createdAt: String(row.created_at),
    });
  }

  for (const row of tour.data ?? []) {
    list.push({
      ref: row.booking_ref as string,
      type: "tour",
      title: "Group Tour",
      date: null,
      amount: Number(row.total_amount),
      status: String(row.booking_status ?? "pending"),
      paymentStatus: row.status === "confirmed" ? "paid" : row.status === "cancelled" ? "failed" : "pending",
      createdAt: String(row.created_at),
    });
  }

  for (const raw of (invitation.data as unknown as Array<{ ref: string; status: string; amount_pkr: number; arrival_date: string | null; embassy_city: string | null; created_at: string }>) ?? []) {
    const statusToBooking: Record<string, string> = {
      pending_payment: "pending",
      paid: "active",
      issued: "completed",
      failed: "cancelled",
      cancelled: "cancelled",
    };
    const statusToPayment: Record<string, string> = {
      pending_payment: "pending",
      paid: "paid",
      issued: "paid",
      failed: "failed",
      cancelled: "failed",
    };
    list.push({
      ref: raw.ref,
      type: "invitation",
      title: raw.embassy_city ? `Invitation Letter — ${raw.embassy_city}` : "Invitation Letter",
      date: raw.arrival_date,
      amount: Number(raw.amount_pkr),
      status: statusToBooking[raw.status] ?? "pending",
      paymentStatus: statusToPayment[raw.status] ?? "pending",
      createdAt: raw.created_at,
    });
  }

  return list.sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
}
