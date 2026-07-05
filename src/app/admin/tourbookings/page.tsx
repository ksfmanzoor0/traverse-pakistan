import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { BookingStatusSelect } from "@/components/admin/BookingStatusSelect";
import { getAllTours } from "@/services/tour.service";
import { formatPrice } from "@/lib/utils";
import type { BookingRow, BookingStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: "all" | BookingStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

type BookingWithDeparture = BookingRow & {
  departures: { tour_slug: string; departure_date: string; departure_city: string | null } | null;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function getBookings(
  filter: "all" | BookingStatus,
  departureId?: string,
): Promise<BookingWithDeparture[]> {
  const supabase = await getSupabaseServer();
  let query = supabase
    .from("bookings")
    .select("*, departures(tour_slug, departure_date, departure_city)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "all") query = query.eq("status", filter);
  if (departureId) query = query.eq("departure_id", departureId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as BookingWithDeparture[];
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; departure?: string }>;
}) {
  const { status, departure } = await searchParams;
  const activeFilter = (STATUS_FILTERS.find((f) => f.value === status)?.value ??
    "all") as "all" | BookingStatus;

  const [rows, tours] = await Promise.all([
    getBookings(activeFilter, departure),
    getAllTours(),
  ]);
  const tourNameBySlug = new Map(tours.map((t) => [t.slug, t.name]));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Bookings
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {rows.length} {rows.length === 1 ? "booking" : "bookings"}
            {activeFilter !== "all" ? ` in "${activeFilter}"` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const active = f.value === activeFilter;
            const href =
              f.value === "all"
                ? "/admin/tourbookings"
                : `/admin/tourbookings?status=${f.value}`;
            return (
              <Link
                key={f.value}
                href={href}
                className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
                style={{
                  color: active ? "var(--text-inverse)" : "var(--text-secondary)",
                  background: active ? "var(--primary)" : "var(--bg-primary)",
                  border: `1px solid ${active ? "var(--primary)" : "var(--border-default)"}`,
                }}
              >
                {f.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div
        className="mt-6 rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border-default)",
        }}
      >
        {rows.length === 0 ? (
          <div
            className="p-12 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            No bookings to show.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left"
                  style={{
                    background: "var(--bg-subtle)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Ref
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Received
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Tour
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Departure
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Seats
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">
                    Total
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const tourSlug = row.departures?.tour_slug;
                  const tourName = tourSlug
                    ? tourNameBySlug.get(tourSlug) ?? tourSlug
                    : "—";
                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderTop: "1px solid var(--border-default)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="font-mono font-semibold"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {row.booking_ref}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {tourName}
                        </div>
                        <div
                          className="text-xs capitalize"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          from {row.departures?.departure_city ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.departures?.departure_date ? (
                          formatDateShort(row.departures.departure_date)
                        ) : (
                          <span style={{ color: "var(--text-tertiary)" }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="font-medium"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {row.contact_name}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          <a
                            href={`mailto:${row.contact_email}`}
                            className="hover:underline"
                          >
                            {row.contact_email}
                          </a>
                          {" · "}
                          <a
                            href={`https://wa.me/${row.contact_phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:underline"
                          >
                            {row.contact_phone}
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.seats}
                        {row.single_rooms > 0
                          ? ` · ${row.single_rooms} single`
                          : ""}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-semibold"
                          style={{ color: "var(--text-primary)" }}>
                        {formatPrice(row.total_amount)}
                      </td>
                      <td className="px-4 py-3">
                        <BookingStatusSelect id={row.id} initial={row.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
