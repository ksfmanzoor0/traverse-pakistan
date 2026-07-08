import { getResend, FROM } from "./resend";
import type { LetterData } from "@/lib/invitation/letterData";
import { generateInvitationLetterPdf } from "@/lib/invitation/generatePdf";

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!raw) return "https://traversepakistan.com";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

function renderLetterHtml(data: LetterData): string {
  const site = siteUrl();
  const rows = data.travelers
    .map(
      (t) => `<tr>
        <td style="border:1px solid #e5e7eb;padding:6px 10px;text-transform:uppercase">${esc(t.full_name)}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 10px">${esc(t.date_of_birth)}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 10px">${esc(t.nationality)}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 10px">${esc(t.passport_number)}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 10px">${esc(t.passport_expiry)}</td>
      </tr>`,
    )
    .join("");

  return `<div style="font-family:Georgia,'Times New Roman',serif;color:#111;padding:32px;background:#fff;max-width:820px;margin:0 auto">
    <div style="border-top:3px solid #1E6A52;padding-top:24px">
      <table width="100%"><tr>
        <td width="50%" valign="top"><img src="${site}/logo-day.png" alt="Traverse Pakistan" style="height:80px" /></td>
        <td width="50%" valign="top" align="right" style="font-size:13px;color:#1E6A52">
          <div>${esc(data.header.address_line_1)}</div>
          <div>${esc(data.header.address_line_2)}</div>
          <div>${esc(data.header.city)}</div>
          <div>${esc(data.header.phone)}</div>
          <div style="margin-top:12px"><strong>DTS Licence ID:</strong> ${esc(data.header.dts_licence)}</div>
          <div><strong>SECP Incorporation #:</strong> ${esc(data.header.secp_incorporation)}</div>
          <div style="color:#111"><strong>NTN:</strong> ${esc(data.header.ntn)}</div>
        </td>
      </tr></table>
    </div>

    <div style="margin-top:32px">
      <div>To</div>
      <div>${esc(data.addressee_name)}</div>
      <div>${esc(data.embassy_name)}</div>
    </div>

    <p style="margin-top:20px"><strong>Subject:</strong> &nbsp;&nbsp;<u>${esc(data.subject)}</u></p>

    <div style="margin-top:14px;white-space:pre-wrap">${esc(data.body_intro)}</div>

    <table style="width:100%;border-collapse:collapse;margin-top:20px;font-size:13px">
      <thead>
        <tr>
          <th style="background:#1E6A52;color:#fff;padding:8px;border:1px solid #1E6A52">NAME</th>
          <th style="background:#1E6A52;color:#fff;padding:8px;border:1px solid #1E6A52">Date of Birth</th>
          <th style="background:#1E6A52;color:#fff;padding:8px;border:1px solid #1E6A52">Nationality</th>
          <th style="background:#1E6A52;color:#fff;padding:8px;border:1px solid #1E6A52">Passport No.</th>
          <th style="background:#1E6A52;color:#fff;padding:8px;border:1px solid #1E6A52">Expiry Date</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <p style="margin-top:20px">${esc(data.body_close)}</p>

    <div style="margin-top:40px">
      <div>${esc(data.signer_name)}</div>
      <div>${esc(data.signer_title)}</div>
      <div style="margin-top:24px;display:flex;justify-content:space-between;align-items:flex-end">
        <div>
          <div style="border-top:1px solid #000;width:240px;margin-top:56px"></div>
          <div style="font-size:12px">Sign</div>
        </div>
        <div style="font-size:13px">Date: ${esc(data.issued_date)}</div>
      </div>
    </div>
  </div>`;
}

type Input = {
  ref: string;
  contactName: string;
  contactEmail: string;
  letterData: LetterData;
};

export async function sendInvitationLetterIssued(input: Input): Promise<void> {
  const resend = getResend();
  if (!resend) throw new Error("Resend not configured");

  const [pdfBuffer, letterHtml] = await Promise.all([
    generateInvitationLetterPdf(input.letterData),
    Promise.resolve(renderLetterHtml(input.letterData)),
  ]);

  const wrapper = `<div style="font-family:system-ui,-apple-system,sans-serif;color:#111827;max-width:820px;margin:0 auto;padding:16px">
    <p>Hi ${esc(input.contactName)},</p>
    <p>Please find your invitation letter attached as a PDF. A preview is included below. Reference: <strong>${esc(input.ref)}</strong>.</p>
    <p>If you need any changes, reply to this email and we'll help.</p>
    <p>— Traverse Pakistan</p>
    <hr style="margin:24px 0;border:0;border-top:1px solid #e5e7eb" />
    ${letterHtml}
  </div>`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: input.contactEmail,
    subject: `Your Pakistan visa invitation letter — ${input.ref}`,
    html: wrapper,
    attachments: [
      {
        filename: `Invitation-Letter-${input.ref}.pdf`,
        content: pdfBuffer,
      },
    ],
  });
  if (error) throw new Error(error.message);
}
