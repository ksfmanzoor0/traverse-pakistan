"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServer } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import type { BookingStatus } from "@/lib/supabase/types";

const VALID_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "refunded",
];

export async function updateBookingStatus(
  id: string,
  status: BookingStatus
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();

  if (!VALID_STATUSES.includes(status)) {
    return { ok: false, error: "Invalid status" };
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/tourbookings");
  revalidatePath("/admin");
  return { ok: true };
}
