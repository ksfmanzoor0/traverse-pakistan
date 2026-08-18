import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { QuoteStatusSelect } from "@/components/admin/QuoteStatusSelect";
import type { QuoteRequestRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function itemHref(row: QuoteRequestRow): string | null {
  if (!row.slug) return null;
  switch (row.request_type) {
    case "package":
      return `/packages/${row.slug}`;
    case "hotel":
      return `/hotels/${row.slug}`;
    case "tour":
      return `/grouptours/${row.slug}`;
    default:
      return null;
  }
}

async function getRow(id: string): Promise<QuoteRequestRow | null> {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ?? null;
}

export default async function QuoteRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getRow(id);
  if (!row) notFound();

  const phoneDigits = row.contact_phone.replace(/\D/g, "");
  const link = itemHref(row);

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Received", value: formatDate(row.created_at) },
    { label: "Last updated", value: formatDate(row.updated_at) },
    {
      label: "Type",
      value: row.request_type.charAt(0).toUpperCase() + row.request_type.slice(1),
    },
    {
      label: "Item",
      value: link ? (
        <Link
          href={link}
          target="_blank"
          className="hover:underline"
          style={{ color: "var(--primary)" }}
        >
          {row.display_name}
        </Link>
      ) : (
        row.display_name
      ),
    },
    { label: "Slug", value: row.slug ?? "—" },
    { label: "Tier", value: row.tier ?? "—" },
    { label: "Departure city", value: row.departure_city ?? "—" },
    {
      label: "Dates",
      value: row.preferred_start_date
        ? `${row.preferred_start_date}${row.preferred_end_date ? ` → ${row.preferred_end_date}` : ""}`
        : "—",
    },
    {
      label: "Party",
      value: `${row.adults} adult${row.adults === 1 ? "" : "s"}${
        row.children > 0 ? `, ${row.children} child${row.children === 1 ? "" : "ren"}` : ""
      }${row.rooms > 0 ? ` · ${row.rooms} room${row.rooms === 1 ? "" : "s"}` : ""}`,
    },
    { label: "Contact name", value: row.contact_name },
    {
      label: "Email",
      value: (
        <a
          href={`mailto:${row.contact_email}`}
          className="hover:underline"
          style={{ color: "var(--primary)" }}
        >
          {row.contact_email}
        </a>
      ),
    },
    {
      label: "Phone",
      value: (
        <a
          href={`https://wa.me/${phoneDigits}`}
          target="_blank"
          rel="noreferrer"
          className="hover:underline"
          style={{ color: "var(--primary)" }}
        >
          {row.contact_phone}
        </a>
      ),
    },
    { label: "User ID", value: row.user_id ?? "—" },
    { label: "Request ID", value: row.id },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/quote-requests"
          className="text-sm hover:underline"
          style={{ color: "var(--text-secondary)" }}
        >
          ← Back to quote requests
        </Link>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {row.display_name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {row.contact_name} · {formatDate(row.created_at)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span
            className="text-xs uppercase tracking-wider"
            style={{ color: "var(--text-tertiary)" }}
          >
            Status
          </span>
          <QuoteStatusSelect id={row.id} initial={row.status} />
        </div>
      </div>

      <div
        className="mt-6 rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <dl className="divide-y" style={{ borderColor: "var(--border-default)" }}>
          {rows.map((r) => (
            <div
              key={r.label}
              className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-5 py-3 text-sm"
              style={{ borderTop: "1px solid var(--border-default)" }}
            >
              <dt
                className="font-semibold"
                style={{ color: "var(--text-tertiary)" }}
              >
                {r.label}
              </dt>
              <dd
                className="sm:col-span-2 break-words"
                style={{ color: "var(--text-primary)" }}
              >
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <div
        className="mt-6 rounded-2xl p-5"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border-default)",
        }}
      >
        <h2
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ color: "var(--text-tertiary)" }}
        >
          Notes from customer
        </h2>
        <div
          className="mt-3 text-sm whitespace-pre-wrap"
          style={{ color: "var(--text-primary)" }}
        >
          {row.notes && row.notes.trim().length > 0 ? (
            row.notes
          ) : (
            <span style={{ color: "var(--text-tertiary)" }}>
              No notes provided.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
