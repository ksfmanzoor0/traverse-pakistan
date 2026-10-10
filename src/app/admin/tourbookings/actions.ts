"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { sendPaymentConfirmation } from "@/lib/email/sendBookingConfirmation";
import type { BookingStatus } from "@/lib/supabase/types";

const VALID_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "refunded",
];

export async function updateBookingStatus(
  id: string,
  status: BookingStatus,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status" };
  }

  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = { status };
  // Marking confirmed → treat as paid: flip booking_status to active and
  // stamp payment_confirmed_via for audit. Mirrors hotel/package behaviour.
  if (status === "confirmed") {
    update.booking_status = "active";
    update.payment_confirmed_via = "manual";
  }
  const { error } = await supabase
    .from("bookings")
    .update(update as never)
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/tourbookings");
  revalidatePath(`/admin/tourbookings/${id}`);
  revalidatePath("/admin");
  revalidatePath("/bookings/[ref]", "page");
  revalidatePath("/mybookings");
  return { ok: true };
}

// String-arg wrapper so GenericStatusSelect can call it without typing
// to the BookingStatus literal union.
export async function updateBookingStatusByString(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  return updateBookingStatus(id, status as BookingStatus);
}

export type TourBookingDetailsPatch = {
  departure_id?: string;
  seats?: number;
  single_rooms?: number;
  home_city?: string | null;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  total_amount?: number;
  amount_paid?: number;
  notes?: string | null;
};

export async function updateTourBookingDetails(
  id: string,
  patch: TourBookingDetailsPatch,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const update: Record<string, unknown> = {};
  if (patch.departure_id !== undefined) update.departure_id = patch.departure_id;
  if (patch.seats !== undefined) update.seats = Math.max(1, Math.trunc(patch.seats));
  if (patch.single_rooms !== undefined)
    update.single_rooms = Math.max(0, Math.trunc(patch.single_rooms));
  if (patch.home_city !== undefined)
    update.home_city = patch.home_city?.trim() ? patch.home_city.trim() : null;
  if (patch.contact_name !== undefined) update.contact_name = patch.contact_name.trim();
  if (patch.contact_email !== undefined) update.contact_email = patch.contact_email.trim();
  if (patch.contact_phone !== undefined) update.contact_phone = patch.contact_phone.trim();
  if (patch.total_amount !== undefined && Number.isFinite(patch.total_amount))
    update.total_amount = Math.max(0, patch.total_amount);
  if (patch.amount_paid !== undefined && Number.isFinite(patch.amount_paid))
    update.amount_paid = Math.max(0, patch.amount_paid);
  if (patch.notes !== undefined)
    update.notes = patch.notes?.trim() ? patch.notes.trim() : null;

  if (Object.keys(update).length === 0) return { ok: true };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("bookings")
    .update(update as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/tourbookings");
  revalidatePath(`/admin/tourbookings/${id}`);
  revalidatePath("/bookings/[ref]", "page");
  revalidatePath("/mybookings");
  return { ok: true };
}

export async function resendTourBookingConfirmation(
  bookingRef: string,
  force: boolean = false,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!bookingRef) return { ok: false, error: "Missing ref" };

  const supabase = getSupabaseAdmin();
  if (force) {
    await supabase
      .from("bookings")
      .update({ confirmation_sent_at: null })
      .eq("booking_ref", bookingRef);
  }

  try {
    await sendPaymentConfirmation(bookingRef);
  } catch (err) {
    console.error("[resendTourBookingConfirmation]", err);
    return { ok: false, error: (err as Error).message ?? "Send failed" };
  }

  await supabase
    .from("bookings")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("booking_ref", bookingRef);

  revalidatePath(`/admin/tourbookings/${bookingRef}`);
  return { ok: true };
}

export async function deleteTourBooking(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/tourbookings");
  return { ok: true };
}
