import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { InvitationLetterPayButton } from "@/components/invitation/InvitationLetterPayButton";

export const dynamic = "force-dynamic";

type Row = {
  ref: string;
  status: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  embassy_country: string | null;
  embassy_city: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  destinations: string[] | null;
  amount_pkr: number;
  amount_paid: number | null;
  paid_at: string | null;
  issued_at: string | null;
  created_at: string;
};

async function fetchRow(ref: string): Promise<Row | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("invitation_requests" as never)
    .select("ref, status, contact_name, contact_email, contact_phone, embassy_country, embassy_city, arrival_date, departure_date, destinations, amount_pkr, amount_paid, paid_at, issued_at, created_at")
    .eq("ref", ref)
    .maybeSingle();
  return (data as unknown as Row | null) ?? null;
}

export default async function InvitationLetterStatusPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  if (!ref.startsWith("INV-")) notFound();
  const row = await fetchRow(ref);
  if (!row) notFound();

  const statusLabel: Record<string, { title: string; body: string; tone: "success" | "info" | "warning" }> = {
    pending_payment: {
      title: "Request received",
      body: "Your invitation letter request has been created. Complete the payment below to have our team prepare your letter within 1 business day.",
      tone: "info",
    },
    paid: {
      title: "Payment received",
      body: "Our team is preparing your invitation letter. You'll receive it by email within 1 business day.",
      tone: "success",
    },
    issued: {
      title: "Letter issued",
      body: "Your invitation letter has been emailed to you. Check your inbox.",
      tone: "success",
    },
    failed: {
      title: "Payment failed",
      body: "Your last payment attempt didn't go through. You can try again below.",
      tone: "warning",
    },
    cancelled: {
      title: "Request cancelled",
      body: "This request has been cancelled. Contact us if this was a mistake.",
      tone: "info",
    },
  };
  const state = statusLabel[row.status] ?? statusLabel.pending_payment;
  const showPayButton = row.status === "pending_payment" || row.status === "failed";

  return (
    <div className="py-10 sm:py-14">
      <Container>
        <div className="max-w-2xl mx-auto">
          <div className="text-center">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              state.tone === "success" ? "bg-[var(--success)]/10 text-[var(--success)]" :
              state.tone === "warning" ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
              "bg-[var(--primary)]/10 text-[var(--primary)]"
            }`}>
              <Icon name={state.tone === "success" ? "check" : "calendar"} size="lg" />
            </div>
            <h1 className="mt-6 text-[28px] sm:text-[32px] font-bold text-[var(--text-primary)]">{state.title}</h1>
            <p className="mt-3 text-[16px] text-[var(--text-secondary)] leading-relaxed">{state.body}</p>
          </div>

          <div className="mt-8 p-5 rounded-[var(--radius-md)] border border-[var(--border-default)] space-y-2">
            <div className="flex justify-between text-[14px]">
              <span className="text-[var(--text-tertiary)]">Reference</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">{row.ref}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[var(--text-tertiary)]">Name</span>
              <span className="text-[var(--text-primary)]">{row.contact_name}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[var(--text-tertiary)]">Email</span>
              <span className="text-[var(--text-primary)]">{row.contact_email}</span>
            </div>
            {row.contact_phone && (
              <div className="flex justify-between text-[14px]">
                <span className="text-[var(--text-tertiary)]">Phone</span>
                <span className="text-[var(--text-primary)]">{row.contact_phone}</span>
              </div>
            )}
            {(row.embassy_city || row.embassy_country) && (
              <div className="flex justify-between text-[14px]">
                <span className="text-[var(--text-tertiary)]">Embassy</span>
                <span className="text-[var(--text-primary)]">{[row.embassy_city, row.embassy_country].filter(Boolean).join(", ")}</span>
              </div>
            )}
            {row.arrival_date && row.departure_date && (
              <div className="flex justify-between text-[14px]">
                <span className="text-[var(--text-tertiary)]">Trip</span>
                <span className="text-[var(--text-primary)]">{row.arrival_date} → {row.departure_date}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] pt-2 border-t border-[var(--border-default)]">
              <span className="text-[var(--text-tertiary)]">Amount</span>
              <span className="text-[var(--text-primary)]">PKR {Number(row.amount_pkr).toLocaleString()}</span>
            </div>
            {row.amount_paid ? (
              <div className="flex justify-between text-[14px]">
                <span className="text-[var(--text-tertiary)]">Paid</span>
                <span className="text-[var(--success)] font-semibold">PKR {Number(row.amount_paid).toLocaleString()}</span>
              </div>
            ) : null}
          </div>

          {showPayButton && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <InvitationLetterPayButton ref={row.ref} amountPkr={row.amount_pkr} />
              <p className="text-[13px] text-[var(--text-tertiary)]">Secure payment via Alfa Hosted Checkout.</p>
            </div>
          )}

          <div className="mt-8 p-4 rounded-[var(--radius-md)] bg-[var(--bg-subtle)]">
            <p className="text-[13px] text-[var(--text-secondary)]">
              <strong>Save this link</strong> to check status any time:<br />
              <a className="text-[var(--primary)] break-all" href={`/invitation-letter/${row.ref}`}>
                /invitation-letter/{row.ref}
              </a>
            </p>
            <p className="text-[13px] text-[var(--text-tertiary)] mt-2">
              A copy has also been emailed to <strong>{row.contact_email}</strong>.
            </p>
          </div>
        </div>
      </Container>
    </div>
  );
}
