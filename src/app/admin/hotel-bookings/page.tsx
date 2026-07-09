import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAllHotels } from "@/services/hotel.service";
import { formatPrice } from "@/lib/utils";
import { GenericStatusSelect } from "@/components/admin/GenericStatusSelect";
import { DeleteBookingButton } from "@/components/admin/DeleteBookingButton";
import { updateHotelBookingStatus, deleteHotelBooking } from "./actions";

export const dynamic = "force-dynamic";

type HotelBookingRow = {
  id: string;
  booking_ref: string;
  hotel_slug: string;
  checkin_date: string;
  checkout_date: string;
  adults: number;
  children: number;
  nights: number;
  total_amount: number;
  currency: string;
  booking_status: string | null;
  payment_status: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
] as const;

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

async function loadBookings(filter: string): Promise<HotelBookingRow[]> {
  const supabase = await getSupabaseServer();
  let q = supabase
    .from("hotel_bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "all") q = q.eq("booking_status", filter);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as HotelBookingRow[];
}

export default async function HotelBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = STATUS_FILTERS.find((f) => f.value === status)?.value ?? "all";

  const [rows, hotels] = await Promise.all([loadBookings(activeFilter), getAllHotels()]);
  const hotelNameBySlug = new Map(hotels.map((h) => [h.slug, h.name]));

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>Hotel bookings</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {rows.length} {rows.length === 1 ? "booking" : "bookings"}
            {activeFilter !== "all" ? ` in "${activeFilter}"` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const active = f.value === activeFilter;
            const href = f.value === "all" ? "/admin/hotel-bookings" : `/admin/hotel-bookings?status=${f.value}`;
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
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        {rows.length === 0 ? (
          <div className="p-12 text-center text-sm" style={{ color: "var(--text-tertiary)" }}>
            No hotel bookings to show.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left" style={{ background: "var(--bg-subtle)", color: "var(--text-tertiary)" }}>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Ref</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Received</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Hotel</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Check-in → out</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Contact</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Guests</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    style={{ borderTop: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono font-semibold" style={{ color: "var(--text-primary)" }}>
                        {row.booking_ref}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/hotels/${row.hotel_slug}`} className="font-medium hover:underline" style={{ color: "var(--text-primary)" }}>
                        {hotelNameBySlug.get(row.hotel_slug) ?? row.hotel_slug}
                      </Link>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {formatDateShort(row.checkin_date)} → {formatDateShort(row.checkout_date)}
                      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{row.nights}n</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium" style={{ color: "var(--text-primary)" }}>{row.contact_name}</div>
                      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        <a href={`mailto:${row.contact_email}`} className="hover:underline">{row.contact_email}</a>
                        {" · "}
                        <a href={`https://wa.me/${row.contact_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="hover:underline">
                          {row.contact_phone}
                        </a>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.adults + row.children}
                      {row.children > 0 ? ` · ${row.children} child` : ""}
                    </td>
                    <td
                      className="px-4 py-3 whitespace-nowrap text-right tabular-nums font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatPrice(row.total_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <GenericStatusSelect
                        id={row.id}
                        initial={row.booking_status ?? "pending"}
                        options={STATUS_OPTIONS}
                        updateAction={updateHotelBookingStatus}
                      />
                      {row.payment_status && row.payment_status !== "succeeded" && (
                        <div className="text-[11px] mt-1" style={{ color: "var(--text-tertiary)" }}>
                          pay: {row.payment_status}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <DeleteBookingButton
                        id={row.id}
                        refLabel={row.booking_ref}
                        deleteAction={deleteHotelBooking}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
