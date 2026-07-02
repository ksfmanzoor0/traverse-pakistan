import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendPaymentConfirmation } from "@/lib/email/sendBookingConfirmation";

// Updates payment + booking status after Alfa reports a charge. Phase 2
// supports split payments: a deposit charge lands amount_paid < total_amount
// and the row sits in an intermediate state (payment_status='deposit_paid'
// on package_bookings; status='deposit_paid' on bookings) until the balance
// charge lands and pushes amount_paid to total.
//
// amountCharged: the amount Alfa says was captured on this transaction. When
// undefined we fall back to the outstanding balance (legacy full-payment path).
export async function markBooking(
  bookingRef: string,
  isPaid: boolean,
  amountCharged?: number | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  let firstPositivePaymentLanded = false;

  if (bookingRef.startsWith("PKG-")) {
    const { data: before } = await supabase
      .from("package_bookings")
      .select("payment_status, total_amount, amount_paid")
      .eq("booking_ref", bookingRef)
      .maybeSingle();

    if (!before) return;

    if (!isPaid) {
      await supabase
        .from("package_bookings")
        .update({
          payment_status: "failed",
          booking_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("booking_ref", bookingRef);
      return;
    }

    const total = Number(before.total_amount);
    const priorPaid = Number(before.amount_paid ?? 0);
    const charged = amountCharged != null ? Number(amountCharged) : total - priorPaid;
    const newPaid = Math.min(total, priorPaid + charged);
    const nextStatus = newPaid >= total ? "paid" : "deposit_paid";

    firstPositivePaymentLanded = priorPaid === 0 && newPaid > 0;

    await supabase
      .from("package_bookings")
      .update({
        payment_status: nextStatus,
        booking_status: "active",
        amount_paid: newPaid,
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  } else if (bookingRef.startsWith("HTL-")) {
    // Hotels have no deposit-plan toggle in UI — every charge is the full
    // total, so we keep the simpler legacy behaviour.
    const { data: before } = await supabase
      .from("hotel_bookings")
      .select("payment_status, total_amount")
      .eq("booking_ref", bookingRef)
      .maybeSingle();

    if (!before) return;

    firstPositivePaymentLanded = isPaid && (before.payment_status ?? "pending") !== "paid";

    await supabase
      .from("hotel_bookings")
      .update({
        payment_status: isPaid ? "paid" : "failed",
        booking_status: isPaid ? "active" : "pending",
        amount_paid: isPaid ? Number(before.total_amount) : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  } else {
    const { data: before } = await supabase
      .from("bookings")
      .select("status, total_amount, amount_paid")
      .eq("booking_ref", bookingRef)
      .maybeSingle();

    if (!before) return;

    if (!isPaid) {
      await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          booking_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("booking_ref", bookingRef);
      return;
    }

    const total = Number(before.total_amount);
    const priorPaid = Number(before.amount_paid ?? 0);
    const charged = amountCharged != null ? Number(amountCharged) : total - priorPaid;
    const newPaid = Math.min(total, priorPaid + charged);
    // bookings.status is used as payment status here; 'deposit_paid' is the
    // Phase-2 intermediate value between 'pending' and 'confirmed'.
    const nextStatus = newPaid >= total ? "confirmed" : "deposit_paid";

    firstPositivePaymentLanded = priorPaid === 0 && newPaid > 0;

    await supabase
      .from("bookings")
      .update({
        status: nextStatus,
        booking_status: "active",
        amount_paid: newPaid,
        updated_at: new Date().toISOString(),
      })
      .eq("booking_ref", bookingRef);
  }

  // Fire the confirmation on the first positive payment (deposit or full).
  // Balance charges don't refire — the customer already has the ref.
  if (firstPositivePaymentLanded) {
    after(async () => {
      try {
        await sendPaymentConfirmation(bookingRef);
      } catch (err) {
        console.error(`[markBooking] sendPaymentConfirmation failed for ${bookingRef}:`, err);
      }
    });
  }
}
