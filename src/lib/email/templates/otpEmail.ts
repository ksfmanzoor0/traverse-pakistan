export function otpEmailHtml(code: string, bookingRef: string, action: string, magicUrl?: string | null): string {
  const magicBlock = magicUrl
    ? `
      <div style="text-align:center;margin:0 0 24px">
        <a href="${magicUrl}" style="display:inline-block;background:#1E6A52;color:#FFFFFF;font-size:14px;font-weight:700;padding:12px 28px;border-radius:8px;text-decoration:none">
          Tap to ${action}
        </a>
        <p style="margin:14px 0 0;font-size:12px;color:#8A8A8A">One-tap sign-in. Expires after first use or 24 hours.</p>
      </div>
      <div style="border-top:1px solid #E2E2E0;margin:0 0 20px;padding-top:20px">
        <p style="margin:0 0 8px;font-size:12px;color:#8A8A8A;text-align:center">Or enter this code if the link doesn't work</p>
      </div>`
    : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F5F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F5F2;padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%">

        <tr><td style="background:#12302A;padding:24px 32px;border-radius:12px 12px 0 0;text-align:center">
          <p style="margin:0;color:#FFFFFF;font-size:18px;font-weight:700">Traverse Pakistan</p>
        </td></tr>

        <tr><td style="background:#FFFFFF;padding:32px;border-radius:0 0 12px 12px;text-align:center">
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#151515">Verify to ${action}</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#525252">
            Booking <strong style="font-family:monospace">${bookingRef}</strong>
          </p>

          ${magicBlock}

          <div style="background:#F6F5F2;border-radius:10px;padding:20px;margin-bottom:24px;letter-spacing:0.3em">
            <span style="font-size:36px;font-weight:700;color:#1E6A52;font-family:monospace">${code}</span>
          </div>

          <p style="margin:0;font-size:13px;color:#8A8A8A">Code expires in <strong>10 minutes</strong>.</p>
          <p style="margin:8px 0 0;font-size:13px;color:#8A8A8A">If you didn't request this, ignore this email.</p>
        </td></tr>

        <tr><td style="padding:16px 0;text-align:center">
          <p style="margin:0;font-size:12px;color:#8A8A8A">Traverse Pakistan &middot; E-11/1, Islamabad</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function otpEmailText(code: string, bookingRef: string, action: string, magicUrl?: string | null): string {
  const magic = magicUrl ? `\nTap to ${action}: ${magicUrl}\n\nOr enter this 6-digit code if the link doesn't work:\n` : "";
  return `Traverse Pakistan — Verify to ${action}

Booking: ${bookingRef}
${magic}
Code: ${code}

This code expires in 10 minutes.
If you didn't request this, ignore this email.`;
}
