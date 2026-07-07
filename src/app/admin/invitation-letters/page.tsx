import Link from "next/link";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  ref: string;
  status: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  embassy_country: string;
  embassy_city: string;
  amount_paid: number | null;
  amount_pkr: number;
  created_at: string;
  paid_at: string | null;
  issued_at: string | null;
};

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchRows(): Promise<Row[]> {
  const supabase = await getSupabaseServer();
  const { data } = await supabase
    .from("invitation_requests" as never)
    .select("ref, status, contact_name, contact_email, contact_phone, embassy_country, embassy_city, amount_paid, amount_pkr, created_at, paid_at, issued_at")
    .order("created_at", { ascending: false })
    .limit(200);
  return (data as Row[]) ?? [];
}

export default async function AdminInvitationLetters() {
  const rows = await fetchRows();

  return (
    <div className="p-6 sm:p-8">
      <h1 className="text-[24px] font-bold text-[var(--text-primary)] mb-6">Invitation letters</h1>

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-default)]">
        <table className="min-w-full text-[14px]">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
            <tr>
              <th className="text-left p-3">Ref</th>
              <th className="text-left p-3">Contact</th>
              <th className="text-left p-3">Embassy</th>
              <th className="text-left p-3">Status</th>
              <th className="text-right p-3">Paid</th>
              <th className="text-left p-3">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ref} className="border-t border-[var(--border-default)]">
                <td className="p-3">
                  <Link href={`/admin/invitation-letters/${r.ref}`} className="font-mono font-semibold text-[var(--primary)]">
                    {r.ref}
                  </Link>
                </td>
                <td className="p-3">
                  <div className="text-[var(--text-primary)]">{r.contact_name}</div>
                  <div className="text-[12px] text-[var(--text-tertiary)]">{r.contact_email}</div>
                </td>
                <td className="p-3 text-[var(--text-primary)]">{r.embassy_city}, {r.embassy_country}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded text-[12px] font-medium ${
                    r.status === "issued" ? "bg-[var(--success)]/10 text-[var(--success)]" :
                    r.status === "paid" ? "bg-[var(--primary)]/10 text-[var(--primary)]" :
                    r.status === "pending_payment" ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
                    "bg-[var(--bg-subtle)] text-[var(--text-tertiary)]"
                  }`}>
                    {r.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="p-3 text-right text-[var(--text-primary)]">
                  {r.amount_paid ? `PKR ${Number(r.amount_paid).toLocaleString()}` : "—"}
                </td>
                <td className="p-3 text-[var(--text-tertiary)] text-[12px]">{fmt(r.created_at)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-[var(--text-tertiary)]">No requests yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
