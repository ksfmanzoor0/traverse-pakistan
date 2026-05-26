import { getSupabaseAdmin } from "@/lib/supabase/server";

// Updates payment + booking status on the relevant booking table.
// Confirmation emails are NOT sent from here — they fire from the success
// pages and the legacy /api/payments/alfa/initiate route at booking-creation
// time, so the user gets a magic link in their inbox before they finish paying.
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
