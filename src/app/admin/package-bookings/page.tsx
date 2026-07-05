import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAllPackages } from "@/services/package.service";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PackageBookingRow = {
  id: string;
  booking_ref: string;
  package_slug: string;
  tier: string;
  departure_city: string | null;
  start_date: string;
  adults: number;
  rooms: number;
  total_amount: number;
  currency: string;
  status: string;
  payment_status: string | null;
  booking_status: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
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

async function loadBookings(filter: string): Promise<PackageBookingRow[]> {
  const supabase = await getSupabaseServer();
  let q = supabase
    .from("package_bookings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "all") q = q.eq("status", filter);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as PackageBookingRow[];
}

export default async function PackageBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const active = STATUS_FILTERS.find((f) => f.value === status)?.value ?? "all";

  const [rows, packages] = await Promise.all([loadBookings(active), getAllPackages()]);
  const pkgNameBySlug = new Map(packages.map((p) => [p.slug, p.name]));

  return (
    <div className="max-w-6xl">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-[24px] font-bold" style={{ color: "var(--text-primary)" }}>Package Bookings</h1>
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
          No package bookings found.
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border-default)" }}>
          <table className="w-full text-[13px]">
            <thead style={{ background: "var(--bg-subtle)", color: "var(--text-tertiary)" }}>
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">Ref</th>
                <th className="px-4 py-2 font-medium">Package</th>
                <th className="px-4 py-2 font-medium">Tier · City</th>
                <th className="px-4 py-2 font-medium">Start</th>
                <th className="px-4 py-2 font-medium">Pax / Rooms</th>
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
                    <Link href={`/packages/${r.package_slug}`} className="hover:underline font-medium">
                      {pkgNameBySlug.get(r.package_slug) ?? r.package_slug}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 capitalize">
                    {r.tier}
                    {r.departure_city && (
                      <span style={{ color: "var(--text-tertiary)" }}> · {r.departure_city.toUpperCase()}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{fmtDate(r.start_date)}</td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {r.adults}p / {r.rooms}r
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{formatPrice(r.total_amount)}</td>
                  <td className="px-4 py-2.5">
                    <StatusPill s={r.status} />
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
