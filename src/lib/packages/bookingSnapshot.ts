import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getPackageBySlug, getPackageItinerary } from "@/services/package.service";
import type { Package, PackageItinerary, PackageTier } from "@/types/package";
import type { PackageBookingSnapshot, BookingSnapshotDay } from "@/types/packageBookingSnapshot";

/**
 * Build a fresh snapshot from the current package + itinerary at the
 * booked tier. Called at admin edit time (materialization) or when a
 * booking has no snapshot yet and admin opens the editor.
 */
export function buildSnapshotFromPackage(
  pkg: Package,
  itinerary: PackageItinerary | null,
  tier: PackageTier,
): PackageBookingSnapshot {
  const days: BookingSnapshotDay[] = (itinerary?.days ?? []).map((d) => ({
    dayNumber: d.dayNumber,
    title: d.title ?? "",
    description: d.description ?? "",
    stops: (d.stops ?? []).map((s) => ({ name: s.name ?? "", detail: s.detail ?? "" })),
    hotelSlug: tier === "luxury" ? (d.hotels?.luxury ?? "") : (d.hotels?.deluxe ?? ""),
    overnight: d.overnight ?? "",
    drivingTime: d.drivingTime ?? "",
  }));

  return {
    days,
    inclusions: [...(pkg.inclusions ?? [])],
    exclusions: [...(pkg.exclusions ?? [])],
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Lazily snapshot the standard package into itinerary_original ONCE per
 * booking. Idempotent — subsequent calls are cheap no-ops that only read
 * the row. Called from the checkout success page so the freeze happens
 * synchronously with booking creation, before any admin edits can occur.
 * Never overwrites an existing itinerary_original.
 */
export async function snapshotOriginalIfMissing(bookingRef: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("package_bookings")
    .select("package_slug, tier, itinerary_original")
    .eq("booking_ref", bookingRef)
    .maybeSingle();
  if (!data) return;
  const row = data as unknown as { package_slug: string; tier: string | null; itinerary_original: unknown };
  if (row.itinerary_original != null) return; // already snapshotted

  const [pkg, itinerary] = await Promise.all([
    getPackageBySlug(row.package_slug),
    getPackageItinerary(row.package_slug),
  ]);
  if (!pkg) return;

  const original = buildSnapshotFromPackage(pkg, itinerary, (row.tier as PackageTier) ?? "deluxe");
  await supabase
    .from("package_bookings")
    // Cast: TS types haven't been regenerated since itinerary_original was
    // added. Column exists in the live schema.
    .update({ itinerary_original: original } as never)
    .eq("booking_ref", bookingRef);
}
