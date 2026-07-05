interface BookingConfirmationParams {
  bookingRef: string;
  contactName: string;
  contactEmail: string;
  bookingType: "tour" | "package" | "hotel";
  itemName: string;
  totalAmount: number;
  details: Record<string, string>;
  viewUrl: string; // magic-link URL — signs the user in on click
  paymentStatus: "pending" | "paid" | "failed" | "deposit_paid";
  amountPaid?: number;
  balanceDue?: number;
}

function copyFor(status: BookingConfirmationParams["paymentStatus"], bookingType: BookingConfirmationParams["bookingType"]) {
  if (status === "deposit_paid") {
    return {
      title: "Deposit Received",
      subhead: `Thanks — your deposit is in and your ${bookingType} is reserved. Pay the balance any time before departure.`,
      amountLabel: "Deposit Paid",
      cta: "Pay Remaining Balance",
      textTitle: "Deposit Received",
      textBody: `Thanks — your deposit is in and your ${bookingType} is reserved. Pay the balance any time before departure.`,
    };
  }
  if (status === "paid") {
    return {
      title: "Booking Confirmed",
      subhead: `Your ${bookingType} booking is confirmed. We'll be in touch shortly with trip details.`,
      amountLabel: "Amount Paid",
      cta: "View My Booking",
      textTitle: "Booking Confirmed",
      textBody: `Your ${bookingType} booking is confirmed. We'll be in touch shortly.`,
    };
  }
  return {
    title: "Booking Received",
    subhead: `Your ${bookingType} booking is reserved. Complete payment to confirm your spot.`,
    amountLabel: "Amount Due",
    cta: "Complete Payment",
    textTitle: "Booking Received",
    textBody: `Your ${bookingType} booking is reserved. Complete payment to confirm your spot.`,
  };
}

export function bookingConfirmationHtml(p: BookingConfirmationParams): string {
  const viewUrl = p.viewUrl;
  const whatsappUrl = `https://wa.me/923216650670?text=Hi%2C%20I%20need%20help%20with%20booking%20${p.bookingRef}`;
  const c = copyFor(p.paymentStatus, p.bookingType);
  const isSplit = p.paymentStatus === "deposit_paid";
  const amountShown = isSplit && p.amountPaid != null ? p.amountPaid : p.totalAmount;

  const detailRows = Object.entries(p.details)
    .map(([k, v]) => `
      <tr>
        <td style="padding:8px 0;color:#8A8A8A;font-size:13px;width:140px">${k}</td>
        <td style="padding:8px 0;color:#151515;font-size:13px;font-weight:600">${v}</td>
      </tr>`)
    .join("");

  const splitRows = isSplit ? `
      <tr>
        <td style="padding:8px 0;color:#8A8A8A;font-size:13px">Trip Total</td>
        <td style="padding:8px 0;color:#151515;font-size:13px;font-weight:600">PKR ${p.totalAmount.toLocaleString()}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#8A8A8A;font-size:13px">Balance Due</td>
        <td style="padding:8px 0;color:#B45309;font-size:13px;font-weight:700">PKR ${(p.balanceDue ?? 0).toLocaleString()}</td>
      </tr>` : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F6F5F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F5F2;padding:40px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

        <!-- Header -->
        <tr><td style="background:#12302A;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
          <p style="margin:0;color:#FFFFFF;font-size:20px;font-weight:700;letter-spacing:-0.3px">Traverse Pakistan</p>
          <p style="margin:6px 0 0;color:rgba(255,255,255,0.6);font-size:13px">Pakistan's Highest-Rated Tourism Company</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#FFFFFF;padding:32px 32px 24px;border-radius:0 0 12px 12px">

          <!-- Icon + title -->
          <div style="text-align:center;margin-bottom:28px">
            <div style="width:56px;height:56px;background:#E7F3EE;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
              <span style="color:#1E6A52;font-size:26px">&#10003;</span>
            </div>
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#151515">${c.title}</h1>
            <p style="margin:8px 0 0;font-size:14px;color:#525252">
              ${c.subhead}
            </p>
          </div>

          <!-- Booking details -->
          <div style="background:#F6F5F2;border-radius:10px;padding:20px 24px;margin-bottom:24px">
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#8A8A8A">Booking Details</p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:8px 0;color:#8A8A8A;font-size:13px;width:140px">Booking Ref</td>
                <td style="padding:8px 0;color:#151515;font-size:13px;font-weight:700;font-family:monospace">${p.bookingRef}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#8A8A8A;font-size:13px">Name</td>
                <td style="padding:8px 0;color:#151515;font-size:13px;font-weight:600">${p.contactName}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#8A8A8A;font-size:13px">${c.amountLabel}</td>
                <td style="padding:8px 0;color:#1E6A52;font-size:15px;font-weight:700">PKR ${amountShown.toLocaleString()}</td>
              </tr>
              ${splitRows}
              ${detailRows}
            </table>
          </div>

          <!-- CTA -->
          <div style="text-align:center;margin-bottom:24px">
            <a href="${viewUrl}" style="display:inline-block;background:#1E6A52;color:#FFFFFF;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none">
              ${c.cta}
            </a>
            <p style="margin:14px 0 0;font-size:12px;color:#8A8A8A">Tap the button to securely access your booking — no password needed.</p>
          </div>

          <!-- WhatsApp -->
          <div style="text-align:center;border-top:1px solid #E2E2E0;padding-top:20px">
            <p style="margin:0 0 10px;font-size:13px;color:#525252">Need help with your booking?</p>
            <a href="${whatsappUrl}" style="display:inline-block;background:#25D366;color:#FFFFFF;font-size:13px;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none">
              Contact us on WhatsApp
            </a>
          </div>
        </td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 0;text-align:center">
          <p style="margin:0;font-size:12px;color:#8A8A8A">Traverse Pakistan &middot; E-11/1, Islamabad &middot; +92-321-6650670</p>
          <p style="margin:4px 0 0;font-size:12px;color:#8A8A8A">4.9 &#9733; &middot; 1,300+ reviews &middot; TripAdvisor Travelers' Choice 2025</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function bookingConfirmationText(p: BookingConfirmationParams): string {
  const c = copyFor(p.paymentStatus, p.bookingType);
  const isSplit = p.paymentStatus === "deposit_paid";
  const amountShown = isSplit && p.amountPaid != null ? p.amountPaid : p.totalAmount;
  const splitLines = isSplit
    ? `Trip Total: PKR ${p.totalAmount.toLocaleString()}\nBalance Due: PKR ${(p.balanceDue ?? 0).toLocaleString()}\n`
    : "";
  const details = Object.entries(p.details).map(([k, v]) => `${k}: ${v}`).join("\n");
  return `${c.textTitle} — Traverse Pakistan

${c.textBody}

Booking Ref: ${p.bookingRef}
Name: ${p.contactName}
${c.amountLabel}: PKR ${amountShown.toLocaleString()}
${splitLines}${details}

${c.cta}: ${p.viewUrl}

Need help? WhatsApp us at +92-321-6650670

Traverse Pakistan · E-11/1, Islamabad`;
}
