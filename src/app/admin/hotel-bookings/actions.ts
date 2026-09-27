"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { sendPaymentConfirmation } from "@/lib/email/sendBookingConfirmation";

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "refunded"] as const;
const VALID_PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"] as const;

export async function updateHotelBookingStatus(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("hotel_bookings")
    .update({ booking_status: status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/hotel-bookings");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateHotelPaymentStatus(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!VALID_PAYMENT_STATUSES.includes(status as (typeof VALID_PAYMENT_STATUSES)[number])) {
    return { ok: false, error: "Invalid payment status" };
  }
  const supabase = getSupabaseAdmin();
  // payment_confirmed_via is plain text in the DB but typed as
  // "ipn" | "polling" | null in generated types — cast so "manual" is allowed.
  const update: Record<string, string> = { payment_status: status };
  if (status === "paid") {
    update.booking_status = "confirmed";
    update.payment_confirmed_via = "manual";
  }
  const { error } = await supabase
    .from("hotel_bookings")
    .update(update as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/hotel-bookings");
  revalidatePath(`/admin/hotel-bookings/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Manually re-send the "booking confirmed" email + WhatsApp. Reuses the
 * same template path Alfa IPN uses so the guest gets the same experience.
 * `force=true` clears confirmation_sent_at so the send-once guard doesn't
 * skip — useful when an IPN missed and we're catching up manually.
 */
export async function resendHotelBookingConfirmation(
  bookingRef: string,
  force: boolean = false,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!bookingRef) return { ok: false, error: "Missing ref" };

  const supabase = getSupabaseAdmin();
  if (force) {
    await supabase
      .from("hotel_bookings")
      .update({ confirmation_sent_at: null })
      .eq("booking_ref", bookingRef);
  }

  try {
    await sendPaymentConfirmation(bookingRef);
  } catch (err) {
    console.error("[resendHotelBookingConfirmation]", err);
    return { ok: false, error: (err as Error).message ?? "Send failed" };
  }

  // Stamp confirmation_sent_at so the UI reflects the manual send.
  await supabase
    .from("hotel_bookings")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("booking_ref", bookingRef);

  revalidatePath(`/admin/hotel-bookings/${bookingRef}`);
  return { ok: true };
}

export async function deleteHotelBooking(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("hotel_bookings").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/hotel-bookings");
  return { ok: true };
}
