// Meta WhatsApp Business Cloud API client.
// Env-gated: if META_WHATSAPP_TOKEN is not set, sends are no-ops (returns { skipped: true }).
// Used for OTP delivery (authentication template) and booking-confirmed magic links (utility template).

import { normalizePhone, phoneDigitsOnly } from "@/lib/auth/phone";

const GRAPH_VERSION = "v21.0";

interface CloudConfig {
  token: string;
  phoneId: string;
  otpTemplate: string;
  bookingReceivedTemplate: string;
  bookingConfirmedTemplate: string;
  viewMyBookingsTemplate: string;
}

function getConfig(): CloudConfig | null {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return null;
  return {
    token,
    phoneId,
    otpTemplate: process.env.META_WHATSAPP_TEMPLATE_OTP ?? "verification_code",
    bookingReceivedTemplate: process.env.META_WHATSAPP_TEMPLATE_BOOKING_RECEIVED ?? "booking_received",
    bookingConfirmedTemplate: process.env.META_WHATSAPP_TEMPLATE_BOOKING_CONFIRMED ?? "booking_confirmed",
    viewMyBookingsTemplate: process.env.META_WHATSAPP_TEMPLATE_VIEW_MYBOOKINGS ?? "view_mybookings",
  };
}

export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null;
}

interface SendResult {
  ok: boolean;
  skipped?: boolean;
  messageId?: string;
  error?: string;
}

async function sendTemplate(
  toPhone: string,
  templateName: string,
  bodyParams: string[],
  buttonUrlParam?: string
): Promise<SendResult> {
  const cfg = getConfig();
  if (!cfg) {
    console.warn("[whatsapp] not configured, skipping send");
    return { ok: true, skipped: true };
  }

  const recipient = phoneDigitsOnly(normalizePhone(toPhone));
  if (!recipient) return { ok: false, error: "Invalid phone" };

  const components: unknown[] = [
    {
      type: "body",
      parameters: bodyParams.map((text) => ({ type: "text", text })),
    },
  ];

  if (buttonUrlParam) {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: buttonUrlParam }],
    });
  }

  const payload = {
    messaging_product: "whatsapp",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components,
    },
  };

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${cfg.phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("[whatsapp] send failed", data);
      return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, messageId: data.messages?.[0]?.id };
  } catch (err) {
    console.error("[whatsapp] exception", err);
    return { ok: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}

export async function sendOtpViaWhatsApp(toPhone: string, code: string): Promise<SendResult> {
  const cfg = getConfig();
  if (!cfg) return { ok: true, skipped: true };
  // Utility template — code in the body ({{1}}), no copy-code button (that's
  // an authentication-category feature, which requires business verification).
  return sendTemplate(toPhone, cfg.otpTemplate, [code]);
}

// Fires at booking creation — wording: "your booking is reserved, complete payment to confirm".
export async function sendBookingReceivedViaWhatsApp(args: {
  toPhone: string;
  name: string;
  bookingRef: string;
  magicLinkPath: string; // full magic-link URL — passed as a body variable {{3}}
}): Promise<SendResult> {
  const cfg = getConfig();
  if (!cfg) return { ok: true, skipped: true };
  return sendTemplate(
    args.toPhone,
    cfg.bookingReceivedTemplate,
    [args.name, args.bookingRef, args.magicLinkPath]
  );
}

// Fires after payment is confirmed (IPN or polling flip) — wording: "your booking is confirmed".
export async function sendBookingConfirmedViaWhatsApp(args: {
  toPhone: string;
  name: string;
  bookingRef: string;
  magicLinkPath: string; // full magic-link URL — passed as a body variable {{3}}
}): Promise<SendResult> {
  const cfg = getConfig();
  if (!cfg) return { ok: true, skipped: true };
  // Full URL goes in the body ({{3}}), not a URL button — keeps the template
  // domain-agnostic so the same template works on sandbox and production.
  return sendTemplate(
    args.toPhone,
    cfg.bookingConfirmedTemplate,
    [args.name, args.bookingRef, args.magicLinkPath]
  );
}

// Fires from /bookings/find Get a Magic Link CTA when a phone is entered.
// Template body: "Hi {{1}}, here's your secure link to view all your
// Traverse Pakistan bookings: {{2}}. Tap to sign in."
export async function sendViewMyBookingsViaWhatsApp(args: {
  toPhone: string;
  name: string;
  magicLinkPath: string; // full magic-link URL — passed as a body variable {{2}}
}): Promise<SendResult> {
  const cfg = getConfig();
  if (!cfg) return { ok: true, skipped: true };
  return sendTemplate(
    args.toPhone,
    cfg.viewMyBookingsTemplate,
    [args.name, args.magicLinkPath]
  );
}
