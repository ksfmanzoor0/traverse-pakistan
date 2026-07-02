import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getAllTours } from "@/services/tour.service";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

type DepartureWithCount = {
  id: string;
  tour_slug: string;
  departure_date: string;
  end_date: string | null;
  departure_city: string | null;
  status: "open" | "closed" | "cancelled";
  max_seats: number;
  seats_booked: number;
  price: number;
  single_supplement: number | null;
  booking_count: number;
  confirmed_seats: number;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function loadDepartures(): Promise<DepartureWithCount[]> {
  const supabase = await getSupabaseServer();
  const [{ data: deps, error: depErr }, { data: bookings, error: bkErr }] = await Promise.all([
    supabase
      .from("departures")
      .select("id, tour_slug, departure_date, end_date, departure_city, status, max_seats, seats_booked, price, single_supplement")
      .order("departure_date", { ascending: false }),
    supabase
      .from("bookings")
      .select("id, departure_id, seats, status"),
  ]);
  if (depErr) throw new Error(depErr.message);
  if (bkErr) throw new Error(bkErr.message);

  const countByDep = new Map<string, { count: number; confirmedSeats: number }>();
  for (const b of (bookings ?? []) as { departure_id: string; seats: number; status: string }[]) {
    const entry = countByDep.get(b.departure_id) ?? { count: 0, confirmedSeats: 0 };
    entry.count += 1;
    if (b.status === "confirmed") entry.confirmedSeats += b.seats;
    countByDep.set(b.departure_id, entry);
  }

  return ((deps ?? []) as Omit<DepartureWithCount, "booking_count" | "confirmed_seats">[]).map((d) => {
    const c = countByDep.get(d.id);
    return { ...d, booking_count: c?.count ?? 0, confirmed_seats: c?.confirmedSeats ?? 0 };
  });
}

const CITY_LABEL: Record<string, string> = {
  islamabad: "ISB",
  lahore: "LHE",
  karachi: "KHI",
};

export default async function AdminDeparturesPage({
  searchParams,
}: {
  searchParams: Promise<{ tour?: string; range?: string }>;
}) {
  const { tour, range } = await searchParams;
  const rangeFilter = (range === "past" ? "past" : "upcoming") as "past" | "upcoming";

  const [departures, tours] = await Promise.all([loadDepartures(), getAllTours()]);
  const tourNameBySlug = new Map(tours.map((t) => [t.slug, t.name]));
  const today = new Date().toISOString().slice(0, 10);

  const filtered = departures
    .filter((d) => !tour || d.tour_slug === tour)
    .filter((d) => (rangeFilter === "upcoming" ? d.departure_date >= today : d.departure_date < today));

  const bySlug = new Map<string, DepartureWithCount[]>();
  for (const d of filtered) {
    const list = bySlug.get(d.tour_slug) ?? [];
    list.push(d);
    bySlug.set(d.tour_slug, list);
  }
  const orderedSlugs = [...bySlug.keys()].sort((a, b) =>
    (tourNameBySlug.get(a) ?? a).localeCompare(tourNameBySlug.get(b) ?? b)
  );

  const rangeHref = (r: "upcoming" | "past") => {
    const p = new URLSearchParams();
    if (tour) p.set("tour", tour);
    if (r === "past") p.set("range", "past");
    const s = p.toString();
    return s ? `?${s}` : "?range=upcoming";
  };

  return (
    <div className="max-w-6xl">
      <div className="flex items-baseline justify-between mb-4">
        <h1 className="text-[24px] font-bold" style={{ color: "var(--text-primary)" }}>Departures</h1>
        <span className="text-[13px]" style={{ color: "var(--text-tertiary)" }}>
          {filtered.length} {rangeFilter} departures
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "var(--border-default)" }}>
          {(["upcoming", "past"] as const).map((r) => (
            <Link
              key={r}
              href={rangeHref(r)}
              className={`px-3 py-1.5 text-[13px] font-medium ${
                rangeFilter === r
                  ? "bg-[var(--primary)] text-[var(--text-inverse)]"
                  : "hover:bg-[var(--bg-subtle)]"
              }`}
              style={{ color: rangeFilter === r ? undefined : "var(--text-secondary)" }}
            >
              {r === "upcoming" ? "Upcoming" : "Past"}
            </Link>
          ))}
        </div>
        <form className="flex items-center gap-2">
          <input type="hidden" name="range" value={rangeFilter} />
          <select
            name="tour"
            defaultValue={tour ?? ""}
            className="h-9 rounded-md border px-3 text-[13px]"
            style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          >
            <option value="">All tours</option>
            {tours.map((t) => (
              <option key={t.slug} value={t.slug}>{t.name}</option>
            ))}
          </select>
          <button
            type="submit"
            className="h-9 px-3 rounded-md text-[13px] font-medium"
            style={{ background: "var(--primary)", color: "var(--text-inverse)" }}
          >
            Filter
          </button>
        </form>
      </div>

      {orderedSlugs.length === 0 && (
        <div className="rounded-md border p-6 text-[14px]" style={{ borderColor: "var(--border-default)", color: "var(--text-tertiary)" }}>
          No {rangeFilter} departures found.
        </div>
      )}

      <div className="space-y-6">
        {orderedSlugs.map((slug) => {
          const rows = bySlug.get(slug) ?? [];
          const totals = rows.reduce(
            (acc, r) => {
              acc.bookings += r.booking_count;
              acc.confirmed += r.confirmed_seats;
              acc.capacity += r.max_seats;
              return acc;
            },
            { bookings: 0, confirmed: 0, capacity: 0 }
          );
          return (
            <section
              key={slug}
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: "var(--border-default)" }}
            >
              <header className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 border-b" style={{ borderColor: "var(--border-default)", background: "var(--bg-subtle)" }}>
                <div>
                  <Link href={`/grouptours/${slug}`} className="text-[15px] font-bold hover:underline" style={{ color: "var(--text-primary)" }}>
                    {tourNameBySlug.get(slug) ?? slug}
                  </Link>
                  <p className="text-[12px]" style={{ color: "var(--text-tertiary)" }}>
                    {rows.length} departure{rows.length !== 1 ? "s" : ""} · {totals.bookings} booking{totals.bookings !== 1 ? "s" : ""} · {totals.confirmed}/{totals.capacity} confirmed seats
                  </p>
                </div>
              </header>

              <table className="w-full text-[13px]">
                <thead style={{ background: "var(--bg-primary)", color: "var(--text-tertiary)" }}>
                  <tr className="text-left">
                    <th className="px-4 py-2 font-medium">Date</th>
                    <th className="px-4 py-2 font-medium">City</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                    <th className="px-4 py-2 font-medium">Bookings</th>
                    <th className="px-4 py-2 font-medium">Seats</th>
                    <th className="px-4 py-2 font-medium">Price/person</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((d) => {
                    const seatsUsed = d.seats_booked;
                    const seatPct = d.max_seats > 0 ? seatsUsed / d.max_seats : 0;
                    return (
                      <tr key={d.id} className="border-t" style={{ borderColor: "var(--border-default)" }}>
                        <td className="px-4 py-2.5 tabular-nums">
                          {fmtDate(d.departure_date)}
                          {d.end_date && <span style={{ color: "var(--text-tertiary)" }}> → {fmtDate(d.end_date)}</span>}
                        </td>
                        <td className="px-4 py-2.5 uppercase text-[12px] font-semibold">
                          {d.departure_city ? CITY_LABEL[d.departure_city] ?? d.departure_city : "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide"
                            style={{
                              background:
                                d.status === "open"
                                  ? "color-mix(in srgb, var(--success) 15%, transparent)"
                                  : d.status === "cancelled"
                                  ? "color-mix(in srgb, var(--error) 15%, transparent)"
                                  : "var(--bg-subtle)",
                              color:
                                d.status === "open"
                                  ? "var(--success)"
                                  : d.status === "cancelled"
                                  ? "var(--error)"
                                  : "var(--text-secondary)",
                            }}
                          >
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          {d.booking_count > 0 ? (
                            <Link
                              href={`/admin/bookings?departure=${d.id}`}
                              className="font-semibold hover:underline"
                              style={{ color: "var(--primary)" }}
                            >
                              {d.booking_count}
                            </Link>
                          ) : (
                            <span style={{ color: "var(--text-tertiary)" }}>0</span>
                          )}
                          {d.confirmed_seats > 0 && (
                            <span className="ml-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                              ({d.confirmed_seats} conf.)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums" style={{ color: seatPct >= 0.8 ? "var(--error)" : "var(--text-primary)" }}>
                          {seatsUsed}/{d.max_seats}
                        </td>
                        <td className="px-4 py-2.5 tabular-nums">
                          {formatPrice(d.price)}
                          {d.single_supplement ? (
                            <span className="ml-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
                              +{formatPrice(d.single_supplement)} solo
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/admin/bookings?departure=${d.id}`}
                            className="text-[12px] hover:underline"
                            style={{ color: "var(--text-secondary)" }}
                          >
                            View →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>
    </div>
  );
}
