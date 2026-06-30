import { getResend, FROM } from "./resend";

// Team inbox that receives new custom-tour / quote lead notifications.
const NOTIFY_TO = process.env.QUOTE_NOTIFY_TO?.trim() || "info@traversepakistan.com";

export interface QuoteRequestEmailInput {
  requestType: string;
  displayName: string;
  tier?: string | null;
  preferredStartDate?: string | null;
  preferredEndDate?: string | null;
  adults: number;
  children: number;
  rooms: number;
  destinationName?: string | null;
  interests?: string[];
  contact: { name: string; email: string; phone: string };
  notes?: string | null;
}

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!raw) return "https://traversepakistan.com";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function dateRange(start?: string | null, end?: string | null): string {
  if (!start) return "Flexible";
  return end ? `${start} → ${end}` : start;
}

// Best-effort team notification when a quote / custom-tour request is created.
// Env-gated: silently no-ops when RESEND_API_KEY is unset so local/preview
// submissions never fail on a missing email provider. Never throws to the
// caller — the DB row is the source of truth; the email is just a heads-up.
export async function sendQuoteRequestNotification(input: QuoteRequestEmailInput): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[quote] RESEND_API_KEY unset — skipping notification email");
    return;
  }

  const rows: [string, string][] = [
    ["Type", input.requestType],
    ["Summary", input.displayName],
    ...(input.destinationName ? ([["Destination", input.destinationName]] as [string, string][]) : []),
    ...(input.tier ? ([["Tier", input.tier]] as [string, string][]) : []),
    ["Dates", dateRange(input.preferredStartDate, input.preferredEndDate)],
    ["Travellers", `${input.adults} adult(s), ${input.children} child(ren)`],
    ...(input.interests?.length ? ([["Interests", input.interests.join(", ")]] as [string, string][]) : []),
    ["Name", input.contact.name],
    ["Email", input.contact.email],
    ["Phone", input.contact.phone],
    ...(input.notes ? ([["Notes", input.notes]] as [string, string][]) : []),
  ];

  const tableRows = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 12px;color:#6b7280;font-weight:600;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 12px;color:#111827;white-space:pre-wrap">${esc(v)}</td></tr>`
    )
    .join("");

  const adminUrl = `${siteUrl()}/admin/quote-requests`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto">
    <h2 style="font-size:18px;color:#111827;margin:0 0 4px">New custom tour request</h2>
    <p style="font-size:13px;color:#6b7280;margin:0 0 16px">A visitor submitted a Plan My Trip request.</p>
    <table style="border-collapse:collapse;font-size:14px;width:100%;border:1px solid #e5e7eb;border-radius:8px">${tableRows}</table>
    <p style="margin:16px 0 0"><a href="${adminUrl}" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">Open in admin</a></p>
  </div>`;

  const text =
    `New custom tour request\n\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join("\n") +
    `\n\nAdmin: ${adminUrl}`;

  await getResend().emails.send({
    from: FROM,
    to: NOTIFY_TO,
    replyTo: input.contact.email,
    subject: `New custom tour request — ${input.displayName}`,
    html,
    text,
  });
}
