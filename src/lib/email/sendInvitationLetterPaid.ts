import { getResend, FROM } from "./resend";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const NOTIFY_TO = process.env.QUOTE_NOTIFY_TO?.trim() || "info@traversepakistan.com";

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!raw) return "https://traversepakistan.com";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

export async function sendInvitationLetterPaid(ref: string): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("invitation_requests" as never)
    .select("contact_name, contact_email, amount_paid, embassy_country, embassy_city")
    .eq("ref", ref)
    .maybeSingle();
  if (!data) return;
  const row = data as { contact_name: string; contact_email: string; amount_paid: number; embassy_country: string; embassy_city: string };
  const site = siteUrl();

  await resend.emails.send({
    from: FROM,
    to: row.contact_email,
    subject: `Payment received — invitation letter ${ref}`,
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827">
      <p>Hi ${esc(row.contact_name)},</p>
      <p>We've received your payment of <strong>PKR ${Number(row.amount_paid).toLocaleString()}</strong> for invitation letter <strong>${esc(ref)}</strong>.</p>
      <p>Our team is now preparing your letter addressed to the ${esc(row.embassy_city)} embassy. You'll receive it by email within 1 business day.</p>
      <p>— Traverse Pakistan</p>
    </div>`,
  }).catch((err) => console.error("[invitation paid/user]", err));

  await resend.emails.send({
    from: FROM,
    to: NOTIFY_TO,
    subject: `Payment received — invitation letter ${ref}`,
    html: `<p>Invitation letter <strong>${esc(ref)}</strong> has been paid. <a href="${site}/admin/invitation-letters/${ref}">Open in admin</a> to prepare and send.</p>`,
  }).catch((err) => console.error("[invitation paid/admin]", err));
}
