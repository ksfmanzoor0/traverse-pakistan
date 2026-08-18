import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";
import { QuoteStatusSelect } from "@/components/admin/QuoteStatusSelect";
import type { QuoteRequestRow, QuoteRequestStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: { value: "all" | QuoteRequestStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "quoted", label: "Quoted" },
  { value: "converted", label: "Converted" },
  { value: "closed", label: "Closed" },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function typeLabel(t: QuoteRequestRow["request_type"]): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

async function getQuoteRequests(
  filter: "all" | QuoteRequestStatus
): Promise<QuoteRequestRow[]> {
  const supabase = await getSupabaseServer();
  let query = supabase
    .from("quote_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (filter !== "all") query = query.eq("status", filter);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data ?? [];
}

export default async function QuoteRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const activeFilter = (STATUS_FILTERS.find((f) => f.value === status)?.value ??
    "all") as "all" | QuoteRequestStatus;
  const rows = await getQuoteRequests(activeFilter);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Quote Requests
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {rows.length} {rows.length === 1 ? "request" : "requests"}
            {activeFilter !== "all" ? ` in "${activeFilter}"` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const active = f.value === activeFilter;
            const href =
              f.value === "all"
                ? "/admin/quote-requests"
                : `/admin/quote-requests?status=${f.value}`;
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
            No quote requests to show.
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
                    Received
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Item
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Party
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    style={{
                      borderTop: "1px solid var(--border-default)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/admin/quote-requests/${row.id}`}
                        className="hover:underline"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatDate(row.created_at)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{typeLabel(row.request_type)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/quote-requests/${row.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row.display_name}
                      </Link>
                      {row.tier ? (
                        <div
                          className="text-xs"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {row.tier}
                        </div>
                      ) : null}
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
                      {row.adults} adult{row.adults === 1 ? "" : "s"}
                      {row.children > 0 ? `, ${row.children} child` : ""}
                      {row.rooms > 0 ? ` · ${row.rooms} room${row.rooms === 1 ? "" : "s"}` : ""}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {row.preferred_start_date ? (
                        <>
                          {row.preferred_start_date}
                          {row.preferred_end_date
                            ? ` → ${row.preferred_end_date}`
                            : ""}
                        </>
                      ) : (
                        <span style={{ color: "var(--text-tertiary)" }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <QuoteStatusSelect id={row.id} initial={row.status} />
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
