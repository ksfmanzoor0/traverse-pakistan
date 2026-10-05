import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { getAllTours } from "@/services/tour.service";
import { formatPrice } from "@/lib/utils";
import { GenericStatusSelect } from "@/components/admin/GenericStatusSelect";
import { DeleteBookingButton } from "@/components/admin/DeleteBookingButton";
import { SendHotelConfirmationButton } from "@/components/admin/SendHotelConfirmationButton";
import { TourBookingEditor } from "@/components/admin/TourBookingEditor";
import {
  updateBookingStatusByString,
  updateTourBookingDetails,
  resendTourBookingConfirmation,
  deleteTourBooking,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

type BookingRow = {
  id: string;
  booking_ref: string;
  user_id: string | null;
  departure_id: string;
  seats: number;
  single_rooms: number;
  home_city: string | null;
  total_amount: number | string;
  amount_paid: number | string | null;
  currency: string;
  status: string;
  booking_status: string | null;
  refund_status: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  notes: string | null;
  confirmation_sent_at: string | null;
  submit_uuid: string | null;
  payment_plan: string | null;
  deposit_amount: number | string | null;
  payment_confirmed_via: string | null;
  payment_attempts: number | null;
  created_at: string;
  updated_at: string;
};

type DepartureRow = {
  id: string;
  tour_slug: string;
  departure_date: string;
  departure_city: string | null;
};

type ParticipantRow = {
  id: string;
  full_name: string | null;
  passport_number: string | null;
  nationality: string | null;
  date_of_birth: string | null;
};

type TxnRow = {
  id: string;
  alfa_txn_ref: string | null;
  amount: number | string | null;
  is_paid: boolean | null;
  source: string | null;
  created_at: string;
};

type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  raw_user_meta_data: Record<string, unknown> | null;
  created_at: string;
};

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

async function fetchBooking(ref: string): Promise<BookingRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("booking_ref", ref)
    .maybeSingle();
  return (data as unknown as BookingRow | null) ?? null;
}

async function fetchDeparture(id: string): Promise<DepartureRow | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("departures")
    .select("id, tour_slug, departure_date, departure_city")
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as DepartureRow | null) ?? null;
}

async function fetchAllDepartures(): Promise<DepartureRow[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("departures")
    .select("id, tour_slug, departure_date, departure_city")
    .order("departure_date", { ascending: false })
    .limit(300);
  return (data as unknown as DepartureRow[] | null) ?? [];
}

async function fetchParticipants(bookingId: string): Promise<ParticipantRow[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("booking_participants")
    .select("id, full_name, passport_number, nationality, date_of_birth")
    .eq("booking_id", bookingId);
  return (data as unknown as ParticipantRow[] | null) ?? [];
}

async function fetchTransactions(bookingRef: string): Promise<TxnRow[]> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("payment_transactions" as never)
    .select("id, alfa_txn_ref, amount, is_paid, source, created_at")
    .eq("booking_ref", bookingRef)
    .order("created_at", { ascending: false });
  return (data as unknown as TxnRow[] | null) ?? [];
}

async function fetchAuthUser(userId: string | null): Promise<AuthUser | null> {
  if (!userId) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.auth.admin.getUserById(userId);
  if (!data?.user) return null;
  const u = data.user;
  return {
    id: u.id,
    email: u.email ?? null,
    phone: u.phone ?? null,
    email_confirmed_at: u.email_confirmed_at ?? null,
    last_sign_in_at: u.last_sign_in_at ?? null,
    raw_user_meta_data: (u.user_metadata as Record<string, unknown>) ?? null,
    created_at: u.created_at,
  };
}

export default async function AdminTourBookingDetail({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const row = await fetchBooking(ref);
  if (!row) notFound();

  const [departure, participants, transactions, user, tours, allDepartures] =
    await Promise.all([
      fetchDeparture(row.departure_id),
      fetchParticipants(row.id),
      fetchTransactions(row.booking_ref),
      fetchAuthUser(row.user_id),
      getAllTours(),
      fetchAllDepartures(),
    ]);

  const tourNameBySlug = new Map(tours.map((t) => [t.slug, t.name]));
  const tourName = departure ? tourNameBySlug.get(departure.tour_slug) ?? departure.tour_slug : "—";
  const total = Number(row.total_amount);
  const paid = Number(row.amount_paid ?? 0);
  const balance = Math.max(0, total - paid);

  const departureOptions = allDepartures.map((d) => ({
    id: d.id,
    label: `${tourNameBySlug.get(d.tour_slug) ?? d.tour_slug} — ${fmtDate(d.departure_date)}${
      d.departure_city ? ` (${d.departure_city.toUpperCase()})` : ""
    }`,
  }));

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-[1400px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/admin/tourbookings"
            className="text-[13px] text-[var(--text-tertiary)] hover:underline"
          >
            ← All tour bookings
          </Link>
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <h1 className="text-[24px] font-bold text-[var(--text-primary)] font-mono">
              {row.booking_ref}
            </h1>
            <StatusPill label={row.status ?? "pending"} kind="booking" />
            {row.refund_status && (
              <StatusPill label={row.refund_status} kind="refund" />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <GenericStatusSelect
            id={row.id}
            initial={row.status ?? "pending"}
            options={STATUS_OPTIONS}
            updateAction={updateBookingStatusByString}
          />
          <SendHotelConfirmationButton
            bookingRef={row.booking_ref}
            alreadySentAt={row.confirmation_sent_at}
            sendAction={resendTourBookingConfirmation}
          />
          <DeleteBookingButton
            id={row.id}
            refLabel={row.booking_ref}
            deleteAction={deleteTourBooking}
          />
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Tour">
          <dl className="space-y-2 text-[14px]">
            <Row label="Tour">
              {departure ? (
                <Link
                  href={`/grouptours/${departure.tour_slug}`}
                  className="text-[var(--text-primary)] hover:underline"
                >
                  {tourName}
                </Link>
              ) : (
                "—"
              )}
            </Row>
            <Row label="Slug">
              <span className="font-mono text-[13px] text-[var(--text-primary)]">
                {departure?.tour_slug ?? "—"}
              </span>
            </Row>
            <Row label="Departure date">{fmtDate(departure?.departure_date)}</Row>
            <Row label="Departure city">
              {departure?.departure_city?.toUpperCase() ?? "—"}
            </Row>
            <Row label="Home city">{row.home_city?.toUpperCase() ?? "—"}</Row>
          </dl>
        </Card>

        <Card title="Guest">
          <dl className="space-y-2 text-[14px]">
            <Row label="Name">{row.contact_name}</Row>
            <Row label="Email">
              <a
                href={`mailto:${row.contact_email}`}
                className="text-[var(--text-primary)] hover:underline"
              >
                {row.contact_email}
              </a>
            </Row>
            <Row label="Phone">
              <a
                href={`https://wa.me/${row.contact_phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--text-primary)] hover:underline"
              >
                {row.contact_phone}
              </a>
            </Row>
            <Row label="Seats">{row.seats}</Row>
            <Row label="Single rooms">{row.single_rooms}</Row>
          </dl>
        </Card>

        <Card title="Payment">
          <dl className="space-y-2 text-[14px]">
            <Row label="Total">
              <span className="font-semibold text-[var(--text-primary)]">
                {formatPrice(total)}
              </span>
            </Row>
            <Row label="Amount paid">{formatPrice(paid)}</Row>
            <Row label="Balance due">
              <span
                className={balance > 0 ? "text-[var(--warning)]" : "text-[var(--success)]"}
              >
                {formatPrice(balance)}
              </span>
            </Row>
            <Row label="Currency">{row.currency}</Row>
            <Row label="Payment plan">{row.payment_plan ?? "—"}</Row>
            <Row label="Attempts">{row.payment_attempts ?? 0}</Row>
            <Row label="Confirmed via">{row.payment_confirmed_via ?? "—"}</Row>
            <Row label="Confirmation sent">{fmt(row.confirmation_sent_at)}</Row>
          </dl>
        </Card>

        <Card title="Timestamps">
          <dl className="space-y-2 text-[14px]">
            <Row label="Created">{fmt(row.created_at)}</Row>
            <Row label="Updated">{fmt(row.updated_at)}</Row>
            <Row label="Submit UUID">
              <span className="font-mono text-[12px] text-[var(--text-tertiary)]">
                {row.submit_uuid ?? "—"}
              </span>
            </Row>
            <Row label="DB id">
              <span className="font-mono text-[12px] text-[var(--text-tertiary)]">
                {row.id}
              </span>
            </Row>
          </dl>
        </Card>
      </section>

      <section className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)]">
        <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
          Edit reservation
        </h2>
        <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
          Change departure, seats, guest details or amount.
        </p>
        <TourBookingEditor
          id={row.id}
          initial={{
            departure_id: row.departure_id,
            seats: row.seats,
            single_rooms: row.single_rooms,
            home_city: row.home_city,
            contact_name: row.contact_name,
            contact_email: row.contact_email,
            contact_phone: row.contact_phone,
            total_amount: Number(row.total_amount),
            amount_paid: Number(row.amount_paid ?? 0),
            notes: row.notes,
          }}
          departures={departureOptions}
          saveAction={updateTourBookingDetails}
        />
      </section>

      {participants.length > 0 && (
        <section>
          <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            Participants
          </h2>
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-default)]">
            <table className="min-w-full text-[13px]">
              <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
                <tr>
                  <th className="text-left p-3">Full name</th>
                  <th className="text-left p-3">Nationality</th>
                  <th className="text-left p-3">Passport</th>
                  <th className="text-left p-3">DOB</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((p) => (
                  <tr key={p.id} className="border-t border-[var(--border-default)]">
                    <td className="p-3 text-[var(--text-primary)]">{p.full_name ?? "—"}</td>
                    <td className="p-3">{p.nationality ?? "—"}</td>
                    <td className="p-3 font-mono text-[12px]">{p.passport_number ?? "—"}</td>
                    <td className="p-3">{fmtDate(p.date_of_birth)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
          Payment attempts
        </h2>
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-default)]">
          <table className="min-w-full text-[13px]">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              <tr>
                <th className="text-left p-3">When</th>
                <th className="text-left p-3">Alfa txn ref</th>
                <th className="text-left p-3">Source</th>
                <th className="text-right p-3">Amount</th>
                <th className="text-left p-3">Paid?</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-[var(--text-tertiary)]">
                    No transactions recorded. If <code>payment_attempts</code> is non-zero,
                    Alfa never fired an IPN for this booking.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="border-t border-[var(--border-default)]">
                    <td className="p-3 whitespace-nowrap">{fmt(t.created_at)}</td>
                    <td className="p-3 font-mono text-[12px] text-[var(--text-primary)]">
                      {t.alfa_txn_ref ?? "—"}
                    </td>
                    <td className="p-3">{t.source ?? "—"}</td>
                    <td className="p-3 text-right tabular-nums text-[var(--text-primary)]">
                      {t.amount != null ? formatPrice(Number(t.amount)) : "—"}
                    </td>
                    <td className="p-3">
                      {t.is_paid ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]">
                          paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-[var(--bg-subtle)] text-[var(--text-tertiary)]">
                          not paid
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
          User account
        </h2>
        <Card>
          {user ? (
            <dl className="space-y-2 text-[14px]">
              <Row label="Auth user ID">
                <span className="font-mono text-[12px]">{user.id}</span>
              </Row>
              <Row label="Email">{user.email ?? "—"}</Row>
              <Row label="Phone">{user.phone ?? "—"}</Row>
              <Row label="Email confirmed">{fmt(user.email_confirmed_at)}</Row>
              <Row label="Last sign-in">{fmt(user.last_sign_in_at)}</Row>
              <Row label="Verified via OTP">
                {Boolean(
                  (user.raw_user_meta_data as Record<string, unknown> | null)
                    ?.verified_via_otp,
                )
                  ? "yes"
                  : "no"}
              </Row>
              <Row label="Origin">
                {String(
                  (user.raw_user_meta_data as Record<string, unknown> | null)
                    ?.origin ?? "—",
                )}
              </Row>
              <Row label="Created">{fmt(user.created_at)}</Row>
            </dl>
          ) : (
            <p className="text-[13px] text-[var(--text-tertiary)]">
              No linked auth user (stampBookingWithUser did not run).
            </p>
          )}
        </Card>
      </section>

      {row.notes && (
        <section>
          <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
            Notes
          </h2>
          <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[14px] whitespace-pre-wrap text-[var(--text-primary)]">
            {row.notes}
          </div>
        </section>
      )}
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)]">
      {title && (
        <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <dt className="text-[var(--text-tertiary)] min-w-[130px]">{label}</dt>
      <dd className="text-[var(--text-primary)] flex-1">{children}</dd>
    </div>
  );
}

function StatusPill({
  label,
  kind,
}: {
  label: string;
  kind: "booking" | "refund";
}) {
  const tone = ((): { fg: string; bg: string; prefix: string } => {
    const base = { prefix: kind === "booking" ? "" : `${kind}: ` };
    if (label === "confirmed" || label === "paid")
      return { ...base, fg: "var(--success)", bg: "color-mix(in srgb, var(--success) 14%, transparent)" };
    if (label === "pending")
      return { ...base, fg: "var(--warning)", bg: "color-mix(in srgb, var(--warning) 14%, transparent)" };
    if (label === "cancelled" || label === "failed")
      return { ...base, fg: "var(--text-tertiary)", bg: "var(--bg-subtle)" };
    if (label === "refunded")
      return { ...base, fg: "var(--error)", bg: "color-mix(in srgb, var(--error) 12%, transparent)" };
    return { ...base, fg: "var(--text-secondary)", bg: "var(--bg-subtle)" };
  })();
  return (
    <span
      className="inline-flex items-center px-2 py-1 rounded text-[12px] font-medium"
      style={{ color: tone.fg, background: tone.bg }}
    >
      {tone.prefix}
      {label.replace(/_/g, " ")}
    </span>
  );
}
