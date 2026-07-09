import { getResend, FROM } from "./resend";
import { INVITATION_LETTER_PRICE_USD } from "@/lib/invitation/config";
import type { InvitationRequestInput } from "@/lib/invitation/types";
import { readTravelerName } from "@/lib/invitation/types";

const NOTIFY_TO = process.env.QUOTE_NOTIFY_TO?.trim() || "info@traversepakistan.com";

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!raw) return "https://traversepakistan.com";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

type Input = InvitationRequestInput & { ref: string; pricePkr: number };

export async function sendInvitationLetterReceived(input: Input): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const site = siteUrl();
  const travelerRows = input.travelers
    .map((t) => {
      const { surname, first_name } = readTravelerName(t);
      const display = [surname, first_name].filter(Boolean).join(", ");
      return `<tr>
        <td style="padding:6px 10px;border:1px solid #e5e7eb">${esc(display)}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb">${esc(t.nationality)}</td>
        <td style="padding:6px 10px;border:1px solid #e5e7eb">${esc(t.passport_number)}</td>
      </tr>`;
    })
    .join("");

  const summary = `<table style="border-collapse:collapse;font-size:14px;margin-top:8px">
      <tr><td style="padding:4px 10px 4px 0;color:#6b7280">Ref</td><td><strong>${esc(input.ref)}</strong></td></tr>
      <tr><td style="padding:4px 10px 4px 0;color:#6b7280">Embassy</td><td>${esc(input.embassy_country)}, ${esc(input.embassy_city)}</td></tr>
      <tr><td style="padding:4px 10px 4px 0;color:#6b7280">Trip dates</td><td>${esc(input.arrival_date)} → ${esc(input.departure_date)}</td></tr>
      <tr><td style="padding:4px 10px 4px 0;color:#6b7280">Destinations</td><td>${esc(input.destinations.join(", "))}</td></tr>
      <tr><td style="padding:4px 10px 4px 0;color:#6b7280">Travelers</td><td>${input.travelers.length}</td></tr>
    </table>`;

  // Admin notification
  await resend.emails.send({
    from: FROM,
    to: NOTIFY_TO,
    subject: `New invitation letter request — ${input.ref}`,
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827">
      <h2 style="margin:0 0 8px 0">New invitation letter request</h2>
      ${summary}
      <p style="margin-top:16px"><strong>Contact:</strong> ${esc(input.contact_name)} — ${esc(input.contact_email)} · ${esc(input.contact_phone)}</p>
      <table style="border-collapse:collapse;font-size:13px;margin-top:8px">
        <thead><tr>
          <th style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left">Name</th>
          <th style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left">Nationality</th>
          <th style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left">Passport</th>
        </tr></thead>
        <tbody>${travelerRows}</tbody>
      </table>
      <p style="margin-top:20px"><a href="${site}/admin/invitation-letters/${input.ref}" style="color:#0ea5e9">Open in admin</a></p>
    </div>`,
  }).catch((err) => console.error("[invitation received/admin]", err));

  // User confirmation
  await resend.emails.send({
    from: FROM,
    to: input.contact_email,
    subject: `Your invitation letter request — ${input.ref}`,
    html: `<div style="font-family:system-ui,-apple-system,sans-serif;line-height:1.5;color:#111827">
      <p>Hi ${esc(input.contact_name)},</p>
      <p>We've received your invitation letter request. Your reference is <strong>${esc(input.ref)}</strong>.</p>
      <p>Once your payment of <strong>PKR ${input.pricePkr.toLocaleString()}</strong> (equivalent to USD ${INVITATION_LETTER_PRICE_USD}) is confirmed, our team will prepare your letter and email it back within 1 business day.</p>
      ${summary}
      <p style="margin-top:20px">If your plans change, reply to this email and we'll help.</p>
      <p>— Traverse Pakistan</p>
    </div>`,
  }).catch((err) => console.error("[invitation received/user]", err));
}
