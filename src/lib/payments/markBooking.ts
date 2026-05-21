import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function markBooking(bookingRef: string, isPaid: boolean): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (bookingRef.startsWith("PKG-")) {
    await supabase
      .from("package_bookings")
      .update({
        payment_status: isPaid ? "paid" : "failed",
        booking_status: isPaid ? "active" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  } else if (bookingRef.startsWith("HTL-")) {
    await supabase
      .from("hotel_bookings")
      .update({
        payment_status: isPaid ? "paid" : "failed",
        booking_status: isPaid ? "active" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  } else {
    await supabase
      .from("bookings")
      .update({
        status: isPaid ? "confirmed" : "cancelled",
        booking_status: isPaid ? "active" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  }
}
