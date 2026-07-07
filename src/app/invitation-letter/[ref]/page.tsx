import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Icon } from "@/components/ui/Icon";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = {
  ref: string;
  status: string;
  contact_name: string;
  contact_email: string;
  embassy_country: string;
  embassy_city: string;
  arrival_date: string;
  departure_date: string;
  amount_paid: number | null;
  paid_at: string | null;
  issued_at: string | null;
};

async function fetchRow(ref: string): Promise<Row | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("invitation_requests" as never)
    .select("ref, status, contact_name, contact_email, embassy_country, embassy_city, arrival_date, departure_date, amount_paid, paid_at, issued_at")
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
      title: "Waiting for payment",
      body: "Your request has been received but payment is still pending. Please complete the payment to proceed.",
      tone: "warning",
    },
    paid: {
      title: "Payment received",
      body: "Our team is preparing your invitation letter. You'll receive it by email within 2–3 business days.",
      tone: "success",
    },
    issued: {
      title: "Letter issued",
      body: "Your invitation letter has been emailed to you. Check your inbox.",
      tone: "success",
    },
    failed: {
      title: "Payment failed",
      body: "Your payment didn't go through. Please contact us to retry.",
      tone: "warning",
    },
    cancelled: {
      title: "Request cancelled",
      body: "This request has been cancelled. Contact us if this was a mistake.",
      tone: "info",
    },
  };
  const state = statusLabel[row.status] ?? statusLabel.pending_payment;

  return (
    <div className="py-12 sm:py-16">
      <Container>
        <div className="max-w-xl mx-auto text-center">
          <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
            state.tone === "success" ? "bg-[var(--success)]/10 text-[var(--success)]" :
            state.tone === "warning" ? "bg-[var(--warning)]/10 text-[var(--warning)]" :
            "bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
          }`}>
            <Icon name={state.tone === "success" ? "check" : "calendar"} size="lg" />
          </div>
          <h1 className="mt-6 text-[28px] sm:text-[32px] font-bold text-[var(--text-primary)]">{state.title}</h1>
          <p className="mt-3 text-[16px] text-[var(--text-secondary)] leading-relaxed">{state.body}</p>

          <div className="mt-8 p-5 rounded-[var(--radius-md)] bg-[var(--bg-subtle)] text-left space-y-2">
            <div className="flex justify-between text-[14px]">
              <span className="text-[var(--text-tertiary)]">Reference</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">{row.ref}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[var(--text-tertiary)]">Traveler contact</span>
              <span className="text-[var(--text-primary)]">{row.contact_email}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[var(--text-tertiary)]">Embassy</span>
              <span className="text-[var(--text-primary)]">{row.embassy_city}, {row.embassy_country}</span>
            </div>
            <div className="flex justify-between text-[14px]">
              <span className="text-[var(--text-tertiary)]">Trip</span>
              <span className="text-[var(--text-primary)]">{row.arrival_date} → {row.departure_date}</span>
            </div>
            {row.amount_paid && (
              <div className="flex justify-between text-[14px]">
                <span className="text-[var(--text-tertiary)]">Paid</span>
                <span className="text-[var(--text-primary)]">PKR {Number(row.amount_paid).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
      </Container>
    </div>
  );
}
