export interface BookingSnapshotStop {
  name: string;
  detail: string;
}

export interface BookingSnapshotDay {
  dayNumber: number;
  title: string;
  description: string;
  stops: BookingSnapshotStop[];
  hotelSlug: string; // resolved to the booked tier's hotel at snapshot time
  overnight: string;
  drivingTime: string;
}

/**
 * Per-booking frozen itinerary. When present on a package_bookings row,
 * the tailored PDF renders from this instead of the live package data.
 * Independent of the standard package — future edits to the package do
 * not affect a booking that already has a snapshot.
 */
export interface PackageBookingSnapshot {
  days: BookingSnapshotDay[];
  inclusions: string[];
  exclusions: string[];
  updatedAt: string;
}
