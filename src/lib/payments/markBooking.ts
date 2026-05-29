import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendPaymentConfirmation } from "@/lib/email/sendBookingConfirmation";

// Updates payment + booking status on the relevant booking table.
// On the pending → paid transition, fires sendPaymentConfirmation
// (email + WhatsApp "your booking is confirmed" with magic link).
// The "booking received" send happens earlier at booking creation time;
// this one is the follow-up after payment lands.
export async function markBooking(bookingRef: string, isPaid: boolean): Promise<void> {
  const supabase = getSupabaseAdmin();
  let firstTimePaid = false;

  if (bookingRef.startsWith("PKG-")) {
    const { data: before } = await supabase
      .from("package_bookings")
      .select("payment_status")
      .eq("booking_ref", bookingRef)
      .maybeSingle();
    firstTimePaid = isPaid && (before?.payment_status ?? "pending") !== "paid";

    await supabase
      .from("package_bookings")
      .update({
        payment_status: isPaid ? "paid" : "failed",
        booking_status: isPaid ? "active" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  } else if (bookingRef.startsWith("HTL-")) {
    const { data: before } = await supabase
      .from("hotel_bookings")
      .select("payment_status")
      .eq("booking_ref", bookingRef)
      .maybeSingle();
    firstTimePaid = isPaid && (before?.payment_status ?? "pending") !== "paid";

    await supabase
      .from("hotel_bookings")
      .update({
        payment_status: isPaid ? "paid" : "failed",
        booking_status: isPaid ? "active" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  } else {
    const { data: before } = await supabase
      .from("bookings")
      .select("status")
      .eq("booking_ref", bookingRef)
      .maybeSingle();
    firstTimePaid = isPaid && (before?.status ?? "pending") !== "confirmed";

    await supabase
      .from("bookings")
      .update({
        status: isPaid ? "confirmed" : "cancelled",
        booking_status: isPaid ? "active" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  }

  // Fire-and-forget the payment-confirmation send on the pending → paid edge.
  // Both IPN webhook and the status-polling fallback call markBooking; the
  // transition guard prevents duplicate sends.
  if (firstTimePaid) {
    sendPaymentConfirmation(bookingRef).catch((err) => {
      console.error(`[markBooking] sendPaymentConfirmation failed for ${bookingRef}:`, err);
    });
  }
}
