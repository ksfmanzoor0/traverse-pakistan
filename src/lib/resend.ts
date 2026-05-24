import { Resend } from "resend";

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  return new Resend(key);
}

const FROM = "Traverse Pakistan <noreply@traversepakistan.com>";

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Traverse Pakistan</title>
</head>
<body style="margin:0;padding:0;background:#f5f4f0;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f4f0;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:#2d6a4f;padding:28px 32px;">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Traverse Pakistan</p>
            <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:0.5px;text-transform:uppercase;">Pakistan's highest-rated tourism company</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #ede8e0;background:#faf9f7;">
            <p style="margin:0;font-size:11px;color:#888;text-align:center;">
              Traverse Pakistan · E-11/1, Islamabad · +92-321-6650670<br/>
              <a href="https://traversepakistan.com" style="color:#2d6a4f;text-decoration:none;">traversepakistan.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildMagicLinkEmail(magicUrl: string) {
  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1a1a1a;">Sign in to Traverse Pakistan</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
      Tap the button below to sign in. No password needed. This link expires in 1 hour and can only be used once.
    </p>
    <a href="${magicUrl}" style="display:inline-block;background:#2d6a4f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:13px 28px;border-radius:8px;">
      Sign in
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#888;line-height:1.6;">
      If you didn't request this, you can safely ignore this email.
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#aaa;">
      Or copy this link: <span style="color:#2d6a4f;word-break:break-all;">${magicUrl}</span>
    </p>
  `);

  return {
    from: FROM,
    subject: "Your sign-in link · Traverse Pakistan",
    html,
  };
}

