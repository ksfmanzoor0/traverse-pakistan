import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getPackageBySlug, getPackageItinerary } from "@/services/package.service";
import { getAllHotels } from "@/services/hotel.service";
import { buildSnapshotFromPackage } from "@/lib/packages/bookingSnapshot";
import { BookingSnapshotEditor } from "@/components/admin/BookingSnapshotEditor";
import type { PackageBookingSnapshot } from "@/types/packageBookingSnapshot";
import type { PackageTier } from "@/types/package";

export const dynamic = "force-dynamic";

type BookingRow = {
  booking_ref: string;
  package_slug: string;
  tier: string;
  departure_city: string | null;
  start_date: string | null;
  adults: number | null;
  rooms: number | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  total_amount: number | null;
  status: string | null;
  payment_status: string | null;
  itinerary_snapshot: PackageBookingSnapshot | null;
};

export default async function AdminPackageBookingDetail({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const supabase = getSupabaseAdmin();
  const { data: row } = await supabase
    .from("package_bookings")
    .select("booking_ref, package_slug, tier, departure_city, start_date, adults, rooms, contact_name, contact_email, contact_phone, total_amount, status, payment_status, itinerary_snapshot")
    .eq("booking_ref", ref)
    .maybeSingle();
  if (!row) notFound();

  const booking = row as unknown as BookingRow;
  const [pkg, itinerary, hotels] = await Promise.all([
    getPackageBySlug(booking.package_slug),
    getPackageItinerary(booking.package_slug),
    getAllHotels(),
  ]);
  if (!pkg) notFound();

  const initialSnapshot: PackageBookingSnapshot =
    booking.itinerary_snapshot ?? buildSnapshotFromPackage(pkg, itinerary, (booking.tier as PackageTier) ?? "deluxe");

  const hasSnapshot = booking.itinerary_snapshot != null;

  return (
    <div className="p-6 md:p-8 max-w-[1200px] mx-auto">
      <div className="mb-6 flex items-center gap-3 text-sm">
        <Link href="/admin/package-bookings" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
          ← All package bookings
        </Link>
      </div>

      <div className="mb-6 pb-6 border-b border-[var(--border-default)]">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] mb-2">
              Package booking · {booking.status ?? "pending"}
            </p>
            <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] font-mono">
              {booking.booking_ref}
            </h1>
            <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
              {pkg.name} · {booking.tier?.toUpperCase()} · {booking.departure_city?.toUpperCase()}
              {booking.start_date && ` · Start ${new Date(booking.start_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`}
            </p>
            <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">
              {booking.contact_name ?? "-"} · {booking.contact_email ?? "-"} · {booking.contact_phone ?? "-"}
            </p>
          </div>
          <a
            href={`/api/bookings/${booking.booking_ref}/package-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-10 px-4 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[13px] font-semibold text-[var(--text-primary)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
          >
            Preview current PDF
          </a>
        </div>
        <p className="mt-3 text-[12px] text-[var(--text-tertiary)]">
          {hasSnapshot
            ? `Custom itinerary in effect (last edited ${new Date(initialSnapshot.updatedAt).toLocaleString("en-GB")}). PDF uses this snapshot.`
            : `No custom edits yet — currently loading from the standard package itinerary. Saving below will freeze this booking's copy.`}
        </p>
      </div>

      <BookingSnapshotEditor
        bookingRef={booking.booking_ref}
        initialSnapshot={initialSnapshot}
        hotels={hotels.map((h) => ({ slug: h.slug, name: h.name, location: h.location, tier: h.tier as string }))}
      />
    </div>
  );
}
