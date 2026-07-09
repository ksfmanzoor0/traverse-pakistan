"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";

const VALID_STATUSES = ["pending", "confirmed", "cancelled", "refunded"] as const;

export async function updatePackageBookingStatus(
  id: string,
  status: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    return { ok: false, error: "Invalid status" };
  }
  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("package_bookings")
    .update({ status })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/package-bookings");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deletePackageBooking(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const supabase = await getSupabaseServer();
  const { error } = await supabase.from("package_bookings").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/package-bookings");
  return { ok: true };
}
