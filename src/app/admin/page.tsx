import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type StatCard = {
  label: string;
  value: number | string;
  href: string;
  hint?: string;
};

async function getCounts() {
  const supabase = await getSupabaseServer();

  const [newQuotes, pendingBookings, pendingReviews] = await Promise.all([
    supabase
      .from("quote_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("approved", false),
  ]);

  return {
    newQuotes: newQuotes.count ?? 0,
    pendingBookings: pendingBookings.count ?? 0,
    pendingReviews: pendingReviews.count ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const { newQuotes, pendingBookings, pendingReviews } = await getCounts();

  const cards: StatCard[] = [
    {
      label: "New quote requests",
      value: newQuotes,
      href: "/admin/quote-requests",
      hint: "Awaiting first contact",
    },
    {
      label: "Pending bookings",
      value: pendingBookings,
      href: "/admin/tourbookings",
      hint: "Not yet confirmed",
    },
    {
      label: "Reviews to moderate",
      value: pendingReviews,
      href: "/admin/reviews",
      hint: "Unapproved submissions",
    },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1
        className="text-2xl font-semibold"
        style={{ color: "var(--text-primary)" }}
      >
        Dashboard
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Overview of things that need your attention today.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block rounded-2xl p-5 transition-shadow hover:shadow-[var(--shadow-md)]"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-default)",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "var(--text-tertiary)" }}
            >
              {card.label}
            </div>
            <div
              className="mt-2 text-4xl font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {card.value}
            </div>
            {card.hint ? (
              <div
                className="mt-1 text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {card.hint}
              </div>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
