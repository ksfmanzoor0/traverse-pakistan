"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "refunded"] as const;

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

export async function deleteHotelBooking(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("hotel_bookings").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/hotel-bookings");
  return { ok: true };
}
