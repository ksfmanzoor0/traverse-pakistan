"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import { sendPaymentConfirmation } from "@/lib/email/sendBookingConfirmation";

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "refunded"] as const;
const VALID_PAYMENT_STATUSES = [
  "pending",
  "paid",
  "deposit_paid",
  "failed",
  "refunded",
] as const;

export async function updatePackageBookingStatus(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("package_bookings")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/package-bookings");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updatePackagePaymentStatus(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!VALID_PAYMENT_STATUSES.includes(status as (typeof VALID_PAYMENT_STATUSES)[number])) {
    return { ok: false, error: "Invalid payment status" };
  }
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = { payment_status: status };
  if (status === "paid") {
    update.status = "confirmed";
    update.booking_status = "active";
    update.payment_confirmed_via = "manual";
  }
  const { error } = await supabase
    .from("package_bookings")
    .update(update as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/package-bookings");
  revalidatePath(`/admin/package-bookings/${id}`);
  revalidatePath("/admin");
  return { ok: true };
}

export type PackageBookingDetailsPatch = {
  package_slug?: string;
  tier?: string;
  departure_city?: string | null;
  start_date?: string | null;
  adults?: number;
  rooms?: number;
  children_5_12?: number;
  children_2_5?: number;
  infants?: number;
  arrival_time?: string | null;
  notes?: string | null;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  total_amount?: number;
  amount_paid?: number;
};

/**
 * Bulk-edit an existing package booking. Only fields present in `patch` are
 * written. Mirrors the hotel editor pattern.
 */
export async function updatePackageBookingDetails(
  id: string,
  patch: PackageBookingDetailsPatch,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();

  const update: Record<string, unknown> = {};
  if (patch.package_slug !== undefined) update.package_slug = patch.package_slug.trim();
  if (patch.tier !== undefined) update.tier = patch.tier.trim();
  if (patch.departure_city !== undefined)
    update.departure_city = patch.departure_city?.trim() ? patch.departure_city.trim() : null;
  if (patch.start_date !== undefined)
    update.start_date = patch.start_date?.trim() ? patch.start_date : null;
  if (patch.adults !== undefined) update.adults = Math.max(1, Math.trunc(patch.adults));
  if (patch.rooms !== undefined) update.rooms = Math.max(1, Math.trunc(patch.rooms));
  if (patch.children_5_12 !== undefined)
    update.children_5_12 = Math.max(0, Math.trunc(patch.children_5_12));
  if (patch.children_2_5 !== undefined)
    update.children_2_5 = Math.max(0, Math.trunc(patch.children_2_5));
  if (patch.infants !== undefined) update.infants = Math.max(0, Math.trunc(patch.infants));
  if (patch.notes !== undefined)
    update.notes = patch.notes?.trim() ? patch.notes.trim() : null;
  if (patch.contact_name !== undefined) update.contact_name = patch.contact_name.trim();
  if (patch.contact_email !== undefined) update.contact_email = patch.contact_email.trim();
  if (patch.contact_phone !== undefined) update.contact_phone = patch.contact_phone.trim();
  if (patch.total_amount !== undefined && Number.isFinite(patch.total_amount))
    update.total_amount = Math.max(0, patch.total_amount);
  if (patch.amount_paid !== undefined && Number.isFinite(patch.amount_paid))
    update.amount_paid = Math.max(0, patch.amount_paid);

  if (Object.keys(update).length === 0) return { ok: true };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("package_bookings")
    .update(update as never)
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/package-bookings");
  revalidatePath(`/admin/package-bookings/${id}`);
  return { ok: true };
}

export async function resendPackageBookingConfirmation(
  bookingRef: string,
  force: boolean = false,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!bookingRef) return { ok: false, error: "Missing ref" };

  const supabase = getSupabaseAdmin();
  if (force) {
    await supabase
      .from("package_bookings")
      .update({ confirmation_sent_at: null })
      .eq("booking_ref", bookingRef);
  }

  try {
    await sendPaymentConfirmation(bookingRef);
  } catch (err) {
    console.error("[resendPackageBookingConfirmation]", err);
    return { ok: false, error: (err as Error).message ?? "Send failed" };
  }

  await supabase
    .from("package_bookings")
    .update({ confirmation_sent_at: new Date().toISOString() })
    .eq("booking_ref", bookingRef);

  revalidatePath(`/admin/package-bookings/${bookingRef}`);
  return { ok: true };
}

export async function deletePackageBooking(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("package_bookings").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/package-bookings");
  return { ok: true };
}
