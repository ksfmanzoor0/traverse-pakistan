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
