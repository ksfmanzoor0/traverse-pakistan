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
  revalidatePath("/bookings/[ref]", "page");
  revalidatePath("/mybookings");
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
  revalidatePath("/bookings/[ref]", "page");
  revalidatePath("/mybookings");
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

export type HotelBookingDetailsPatch = {
  hotel_slug?: string;
  checkin_date?: string;
  checkout_date?: string;
  adults?: number;
  children?: number;
  arrival_time?: string | null;
  notes?: string | null;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  total_amount?: number;
};

function diffDays(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (Number.isNaN(ms)) return 0;
  return Math.max(0, Math.round(ms / 86_400_000));
}

/**
 * Bulk-edit an existing hotel booking. Every field is optional; only the
 * ones present in `patch` get written. When checkin/checkout are supplied,
 * we also recompute `nights` so the derived value stays consistent.
 */
export async function updateHotelBookingDetails(
  id: string,
  patch: HotelBookingDetailsPatch,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const update: Record<string, unknown> = {};
  if (patch.hotel_slug !== undefined) update.hotel_slug = patch.hotel_slug.trim();
  if (patch.checkin_date !== undefined) update.checkin_date = patch.checkin_date;
  if (patch.checkout_date !== undefined) update.checkout_date = patch.checkout_date;
  if (patch.adults !== undefined) update.adults = Math.max(1, Math.trunc(patch.adults));
  if (patch.children !== undefined) update.children = Math.max(0, Math.trunc(patch.children));
  if (patch.arrival_time !== undefined)
    update.arrival_time = patch.arrival_time?.trim() ? patch.arrival_time.trim() : null;
  if (patch.notes !== undefined)
    update.notes = patch.notes?.trim() ? patch.notes.trim() : null;
  if (patch.contact_name !== undefined) update.contact_name = patch.contact_name.trim();
  if (patch.contact_email !== undefined) update.contact_email = patch.contact_email.trim();
  if (patch.contact_phone !== undefined) update.contact_phone = patch.contact_phone.trim();
  if (patch.total_amount !== undefined && Number.isFinite(patch.total_amount))
    update.total_amount = Math.max(0, patch.total_amount);

  if (patch.checkin_date && patch.checkout_date) {
    update.nights = diffDays(patch.checkin_date, patch.checkout_date);
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("hotel_bookings")
    .update(update as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/hotel-bookings");
  revalidatePath(`/admin/hotel-bookings/${id}`);
  revalidatePath("/bookings/[ref]", "page");
  revalidatePath("/mybookings");
  return { ok: true };
}

export async function updateHotelReservationCode(
  id: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const trimmed = code.trim().slice(0, 60);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("hotel_bookings")
    .update({ reservation_code: trimmed === "" ? null : trimmed } as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/hotel-bookings");
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
