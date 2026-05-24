import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getBookingsForUser } from "@/lib/auth/getUserBookings";
import { formatPrice } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";

const statusColor: Record<string, string> = {
  pending: "var(--warning)",
  active: "var(--success)",
  confirmed: "var(--success)",
  cancelled: "var(--error)",
  completed: "var(--success)",
  rescheduled: "var(--info)",
  postponed: "var(--accent-warm)",
};

function statusBadgeLabel(status: string): string {
  if (status === "active") return "Confirmed";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function TripsPage() {
  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user;

  if (!user) {
    redirect("/bookings/find?next=/account/trips");
  }

  const bookings = await getBookingsForUser(user.id);

  // 1 booking → land directly on it
  if (bookings.length === 1) {
    redirect(`/bookings/${bookings[0].ref}`);
  }

  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "My Trips" }]} />
        <div className="mt-6 mb-6">
          <h1 className="text-[28px] font-bold text-[var(--text-primary)]">My Trips</h1>
          <p className="text-[var(--text-tertiary)] mt-2 text-[14px]">
            All your bookings with Traverse Pakistan.
          </p>
        </div>

        {bookings.length === 0 ? (
          <div className="max-w-md mx-auto text-center py-16 space-y-5">
            <div className="w-14 h-14 mx-auto rounded-full bg-[var(--bg-subtle)] flex items-center justify-center">
              <Icon name="bookmark" size="lg" color="var(--text-tertiary)" />
            </div>
            <div>
              <p className="text-[18px] font-bold text-[var(--text-primary)]">No trips yet</p>
              <p className="text-[14px] text-[var(--text-secondary)] mt-2">
                Once you book a tour, package, or hotel, it&apos;ll show up here.
              </p>
            </div>
            <Link
              href="/packages"
              className="inline-flex h-11 px-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
            >
              Browse packages
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-4xl">
            {bookings.map((b) => {
              const color = statusColor[b.status] ?? "var(--text-tertiary)";
              return (
                <Link
                  key={b.ref}
                  href={`/bookings/${b.ref}`}
                  className="block bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] p-5 hover:border-[var(--primary)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                      {b.type === "hotel" ? "Hotel" : b.type === "package" ? "Package" : "Tour"}
                    </p>
                    <span
                      className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-[var(--radius-full)]"
                      style={{ background: `${color}18`, color }}
                    >
                      {statusBadgeLabel(b.status)}
                    </span>
                  </div>
                  <p className="text-[16px] font-bold text-[var(--text-primary)] mb-1 line-clamp-2">{b.title}</p>
                  <p className="text-[12px] font-mono text-[var(--text-tertiary)] mb-3">{b.ref}</p>
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-[var(--text-secondary)]">
                      {b.date ? new Date(b.date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                    </span>
                    <span className="font-semibold text-[var(--text-primary)]">{formatPrice(b.amount)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
}
