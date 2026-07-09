import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { InvitationRequest, Traveler } from "@/lib/invitation/types";
import { defaultLetterData, type LetterData } from "@/lib/invitation/letterData";
import { getInvitationSignatureDataUrl } from "@/lib/invitation/config";
import { InvitationLetterEditor } from "@/components/admin/InvitationLetterEditor";
import { saveInvitationLetterData, sendInvitationLetter } from "../actions";

export const dynamic = "force-dynamic";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchRow(ref: string): Promise<InvitationRequest | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("invitation_requests" as never)
    .select("*")
    .eq("ref", ref)
    .maybeSingle();
  return (data as unknown as InvitationRequest | null) ?? null;
}

export default async function AdminInvitationLetterDetail({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const [row, signatureDataUrl] = await Promise.all([fetchRow(ref), getInvitationSignatureDataUrl()]);
  if (!row) notFound();

  const travelers = (row.travelers as Traveler[]) ?? [];

  return (
    <div className="p-6 sm:p-8 space-y-8 max-w-[1400px]">
      <div>
        <Link href="/admin/invitation-letters" className="text-[13px] text-[var(--text-tertiary)]">← All requests</Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-[24px] font-bold text-[var(--text-primary)] font-mono">{row.ref}</h1>
          <span className={`inline-flex items-center px-2 py-1 rounded text-[12px] font-medium ${
            row.status === "issued" ? "bg-[var(--success)]/10 text-[var(--success)]" :
            row.status === "paid" ? "bg-[var(--primary)]/10 text-[var(--primary)]" :
            row.status === "pending_payment" ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
            "bg-[var(--bg-subtle)] text-[var(--text-tertiary)]"
          }`}>
            {row.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)]">
          <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Contact</h2>
          <dl className="space-y-2 text-[14px]">
            <div><dt className="text-[var(--text-tertiary)] inline">Name: </dt><dd className="inline text-[var(--text-primary)]">{row.contact_name}</dd></div>
            <div><dt className="text-[var(--text-tertiary)] inline">Email: </dt><dd className="inline text-[var(--text-primary)]">{row.contact_email}</dd></div>
            <div><dt className="text-[var(--text-tertiary)] inline">Phone: </dt><dd className="inline text-[var(--text-primary)]">{row.contact_phone}</dd></div>
          </dl>
        </div>

        <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)]">
          <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Payment</h2>
          <dl className="space-y-2 text-[14px]">
            <div><dt className="text-[var(--text-tertiary)] inline">Amount: </dt><dd className="inline text-[var(--text-primary)]">PKR {Number(row.amount_pkr).toLocaleString()}</dd></div>
            <div><dt className="text-[var(--text-tertiary)] inline">Paid: </dt><dd className="inline text-[var(--text-primary)]">{row.amount_paid ? `PKR ${Number(row.amount_paid).toLocaleString()}` : "—"}</dd></div>
            <div><dt className="text-[var(--text-tertiary)] inline">Paid at: </dt><dd className="inline text-[var(--text-primary)]">{row.paid_at ? fmt(row.paid_at) : "—"}</dd></div>
            <div><dt className="text-[var(--text-tertiary)] inline">Attempts: </dt><dd className="inline text-[var(--text-primary)]">{row.payment_attempts}</dd></div>
          </dl>
        </div>

        <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)]">
          <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Embassy</h2>
          <dl className="space-y-2 text-[14px]">
            <div><dt className="text-[var(--text-tertiary)] inline">Country: </dt><dd className="inline text-[var(--text-primary)]">{row.embassy_country}</dd></div>
            <div><dt className="text-[var(--text-tertiary)] inline">City: </dt><dd className="inline text-[var(--text-primary)]">{row.embassy_city}</dd></div>
          </dl>
        </div>

        <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)]">
          <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Trip</h2>
          <dl className="space-y-2 text-[14px]">
            <div><dt className="text-[var(--text-tertiary)] inline">Arrival: </dt><dd className="inline text-[var(--text-primary)]">{row.arrival_date}</dd></div>
            <div><dt className="text-[var(--text-tertiary)] inline">Departure: </dt><dd className="inline text-[var(--text-primary)]">{row.departure_date}</dd></div>
            <div><dt className="text-[var(--text-tertiary)] inline">Destinations: </dt><dd className="inline text-[var(--text-primary)]">{row.destinations.join(", ")}</dd></div>
          </dl>
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Travelers</h2>
        <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--border-default)]">
          <table className="min-w-full text-[13px]">
            <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)]">
              <tr>
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">DOB</th>
                <th className="text-left p-2">Nationality</th>
                <th className="text-left p-2">Passport #</th>
                <th className="text-left p-2">Expiry</th>
              </tr>
            </thead>
            <tbody>
              {travelers.map((t, i) => (
                <tr key={i} className="border-t border-[var(--border-default)]">
                  <td className="p-2 text-[var(--text-primary)]">{t.full_name}</td>
                  <td className="p-2 text-[var(--text-primary)]">{t.date_of_birth}</td>
                  <td className="p-2 text-[var(--text-primary)]">{t.nationality}</td>
                  <td className="p-2 text-[var(--text-primary)] font-mono">{t.passport_number}</td>
                  <td className="p-2 text-[var(--text-primary)]">{t.passport_expiry}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Letter editor</h2>
        <InvitationLetterEditor
          bookingRef={row.ref}
          initialData={(row.letter_data as LetterData | null) ?? defaultLetterData(row)}
          status={row.status}
          signatureDataUrl={signatureDataUrl}
          saveAction={saveInvitationLetterData}
          sendAction={sendInvitationLetter}
        />
      </section>

      {row.admin_notes && (
        <section>
          <h2 className="text-[14px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Notes</h2>
          <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] text-[14px] whitespace-pre-wrap">{row.admin_notes}</div>
        </section>
      )}

      <div className="text-[12px] text-[var(--text-tertiary)]">
        Created {fmt(row.created_at)} · Updated {fmt(row.updated_at)}
      </div>
    </div>
  );
}
