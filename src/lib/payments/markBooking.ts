import { after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendPaymentConfirmation } from "@/lib/email/sendBookingConfirmation";

export type PaymentSource = "ipn" | "polling";

// Updates payment + booking status after Alfa reports a charge. Phase 2
// supports split payments: a deposit charge lands amount_paid < total_amount
// and the row sits in an intermediate state (payment_status='deposit_paid'
// on package_bookings; status='deposit_paid' on bookings) until the balance
// charge lands and pushes amount_paid to total.
//
// amountCharged: the amount Alfa says was captured on this transaction. When
//   undefined we fall back to the outstanding balance (legacy full-payment path).
// source: which route invoked us — 'ipn' (Alfa webhook) or 'polling' (status
//   endpoint checking Alfa's IPN API on page load). Recorded on the first
//   positive payment landing so ops can see whether IPN whitelisting is
//   actually working:
//     select payment_confirmed_via, count(*) from bookings where amount_paid > 0 group by 1;
export async function markBooking(
  bookingRef: string,
  isPaid: boolean,
  amountCharged?: number | null,
  source: PaymentSource = "polling",
  alfaTxnRef?: string | null,
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Idempotency guard. Alfa can redeliver IPNs, and our polling path can race
  // an IPN that already landed. Both would otherwise re-run the additive
  // amount_paid update and double the deposit. The ledger's UNIQUE
  // (booking_ref, alfa_txn_ref) index means the second insert fails with
  // 23505, at which point we no-op the rest of the function. When the caller
  // has no txn ref (legacy callsite, defensive fallback) we skip the guard.
  if (alfaTxnRef) {
    const { error: ledgerErr } = await supabase
      .from("payment_transactions" as never)
      .insert({
        booking_ref: bookingRef,
        alfa_txn_ref: alfaTxnRef,
        amount: amountCharged ?? 0,
        is_paid: isPaid,
        source,
      } as never);
    if (ledgerErr) {
      // 23505 = unique_violation. Anything else is unexpected; log and bail
      // rather than proceed with a partially-reconciled state.
      if (ledgerErr.code === "23505") {
        console.log(`[markBooking] duplicate txn ${alfaTxnRef} for ${bookingRef} — skipping`);
        return;
      }
      console.error(`[markBooking] ledger insert failed for ${bookingRef}/${alfaTxnRef}:`, ledgerErr);
      return;
    }
  }

  let shouldFireConfirmation = false;
  let isFirstPositivePayment = false;

  if (bookingRef.startsWith("INV-")) {
    const { data: before } = await supabase
      .from("invitation_requests" as never)
      .select("status, amount_pkr, amount_paid")
      .eq("ref", bookingRef)
      .maybeSingle();

    if (!before) return;
    const rec = before as { status: string; amount_pkr: number; amount_paid: number | null };

    if (!isPaid) {
      await supabase
        .from("invitation_requests" as never)
        .update({ status: "failed", updated_at: new Date().toISOString() } as never)
        .eq("ref", bookingRef);
      return;
    }

    isFirstPositivePayment = (rec.amount_paid ?? 0) === 0;
    shouldFireConfirmation = isFirstPositivePayment;
    const paid = amountCharged != null ? Number(amountCharged) : Number(rec.amount_pkr);

    await supabase
      .from("invitation_requests" as never)
      .update({
        status: "paid",
        amount_paid: paid,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as never)
      .eq("ref", bookingRef);

    if (shouldFireConfirmation) {
      const { sendInvitationLetterPaid } = await import("@/lib/email/sendInvitationLetterPaid");
      after(async () => {
        try { await sendInvitationLetterPaid(bookingRef); }
        catch (err) { console.error(`[markBooking] invitation paid email failed for ${bookingRef}:`, err); }
      });
    }
    console.log(`[markBooking] ref=${bookingRef} (invitation) source=${source} firstPositive=${isFirstPositivePayment}`);
    return;
  }

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

    // Fire the confirmation both on the first positive payment (deposit lands)
    // AND on the transition into fully paid (balance clears). Deposit lands
    // "your booking is confirmed with deposit"; balance lands "fully paid".
    const wasFullyPaid = (before.payment_status ?? "pending") === "paid";
    isFirstPositivePayment = priorPaid === 0 && newPaid > 0;
    shouldFireConfirmation = isFirstPositivePayment
      || (!wasFullyPaid && newPaid >= total && priorPaid > 0);

    await supabase
      .from("package_bookings")
      .update({
        payment_status: nextStatus,
        booking_status: "active",
        amount_paid: newPaid,
        updated_at: new Date().toISOString(),
        ...(isFirstPositivePayment ? { payment_confirmed_via: source } : {}),
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

    isFirstPositivePayment = isPaid && (before.payment_status ?? "pending") !== "paid";
    shouldFireConfirmation = isFirstPositivePayment;

    await supabase
      .from("hotel_bookings")
      .update({
        payment_status: isPaid ? "paid" : "failed",
        booking_status: isPaid ? "active" : "pending",
        amount_paid: isPaid ? Number(before.total_amount) : 0,
        updated_at: new Date().toISOString(),
        ...(isFirstPositivePayment ? { payment_confirmed_via: source } : {}),
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

    // Fire on the first positive payment (deposit) AND again on the flip into
    // fully paid (balance charge). Two customer touchpoints, same magic link.
    const wasFullyPaid = (before.status ?? "pending") === "confirmed";
    isFirstPositivePayment = priorPaid === 0 && newPaid > 0;
    shouldFireConfirmation = isFirstPositivePayment
      || (!wasFullyPaid && newPaid >= total && priorPaid > 0);

    await supabase
      .from("bookings")
      .update({
        status: nextStatus,
        booking_status: "active",
        amount_paid: newPaid,
        updated_at: new Date().toISOString(),
        ...(isFirstPositivePayment ? { payment_confirmed_via: source } : {}),
      })
      .eq("booking_ref", bookingRef);
  }

  console.log(`[markBooking] ref=${bookingRef} source=${source} firstPositive=${isFirstPositivePayment} fireConfirm=${shouldFireConfirmation}`);

  // Fires on two edges: (1) first positive payment (deposit or full-in-one),
  // and (2) the deposit→fully-paid flip when the balance charge lands.
  // The email template branches on payment_status to render the right copy.
  if (shouldFireConfirmation) {
    after(async () => {
      try {
        await sendPaymentConfirmation(bookingRef);
      } catch (err) {
        console.error(`[markBooking] sendPaymentConfirmation failed for ${bookingRef}:`, err);
      }
    });
  }
}
