import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAllHotels } from "@/services/hotel.service";
import { formatPrice } from "@/lib/utils";

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
  arrival_time: string | null;
  notes: string | null;
  created_at: string;
};

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
] as const;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
  const active = STATUS_FILTERS.find((f) => f.value === status)?.value ?? "all";

  const [rows, hotels] = await Promise.all([loadBookings(active), getAllHotels()]);
  const hotelNameBySlug = new Map(hotels.map((h) => [h.slug, h.name]));

  return (
    <div className="max-w-6xl">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-[24px] font-bold" style={{ color: "var(--text-primary)" }}>Hotel Bookings</h1>
        <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          {rows.length} row{rows.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex rounded-md overflow-hidden border mb-5 w-max" style={{ borderColor: "var(--border-default)" }}>
        {STATUS_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "?" : `?status=${f.value}`}
            className={`px-3 py-1.5 text-[13px] font-medium ${
              active === f.value
                ? "bg-[var(--primary)] text-[var(--text-inverse)]"
                : "hover:bg-[var(--bg-subtle)]"
            }`}
            style={{ color: active === f.value ? undefined : "var(--text-secondary)" }}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border p-6 text-[14px]" style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}>
          No hotel bookings found.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)" }}>
          <table className="w-full text-[13px]">
            <thead style={{ background: "var(--bg-subtle)", color: "var(--text-tertiary)" }}>
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Ref</th>
                <th className="px-4 py-2 font-medium">Hotel</th>
                <th className="px-4 py-2 font-medium">Check-in → out</th>
                <th className="px-4 py-2 font-medium">Nights · Guests</th>
                <th className="px-4 py-2 font-medium">Amount</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Contact</th>
                <th className="px-4 py-2 font-medium">Booked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t align-top" style={{ borderColor: "var(--border-default)" }}>
                  <td className="px-4 py-2.5 font-mono text-[12px]">{r.booking_ref}</td>
                  <td className="px-4 py-2.5">
                    <Link href={`/hotels/${r.hotel_slug}`} className="hover:underline font-medium">
                      {hotelNameBySlug.get(r.hotel_slug) ?? r.hotel_slug}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {fmtDate(r.checkin_date)} → {fmtDate(r.checkout_date)}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {r.nights}n · {r.adults + r.children}p
                    {r.children > 0 && (
                      <span style={{ color: "var(--text-tertiary)" }}> ({r.children}c)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{formatPrice(r.total_amount)}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill s={r.booking_status ?? "pending"} />
                    {r.payment_status && r.payment_status !== "succeeded" && (
                      <div className="text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                        pay: {r.payment_status}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="text-[13px]">{r.contact_name}</div>
                    <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      {r.contact_phone}
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                      {r.contact_email}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-[11px] tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                    {fmtDateTime(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusPill({ s }: { s: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    confirmed: { bg: "color-mix(in srgb, var(--success) 15%, transparent)", fg: "var(--success)" },
    pending: { bg: "color-mix(in srgb, var(--accent-warm) 15%, transparent)", fg: "var(--accent-warm)" },
    cancelled: { bg: "color-mix(in srgb, var(--error) 15%, transparent)", fg: "var(--error)" },
    refunded: { bg: "var(--bg-subtle)", fg: "var(--text-secondary)" },
  };
  const c = map[s] ?? { bg: "var(--bg-subtle)", fg: "var(--text-secondary)" };
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: c.bg, color: c.fg }}
    >
      {s}
    </span>
  );
}
