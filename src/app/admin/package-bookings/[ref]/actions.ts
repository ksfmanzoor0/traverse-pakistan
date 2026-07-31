"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { PackageBookingSnapshot } from "@/types/packageBookingSnapshot";

export async function saveBookingItinerarySnapshot(
  bookingRef: string,
  snapshot: PackageBookingSnapshot,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const payload = { ...snapshot, updatedAt: now };
  const { error } = await supabase
    .from("package_bookings")
    // Cast: TS types haven't been regenerated since the itinerary_snapshot
    // column was added. Column exists in the live schema.
    .update({ itinerary_snapshot: payload } as never)
    .eq("booking_ref", bookingRef);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/admin/package-bookings/${bookingRef}`);
  revalidatePath("/admin/package-bookings");
  return { ok: true };
}
