// Meta WhatsApp Business Cloud API client.
// Env-gated: if META_WHATSAPP_TOKEN is not set, sends are no-ops (returns { skipped: true }).
// Used for OTP delivery (authentication template) and booking-confirmed magic links (utility template).

import { normalizePhone, phoneDigitsOnly } from "@/lib/auth/phone";

const GRAPH_VERSION = "v21.0";

interface CloudConfig {
  token: string;
  phoneId: string;
  otpTemplate: string;
  bookingConfirmedTemplate: string;
}

function getConfig(): CloudConfig | null {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneId = process.env.META_WHATSAPP_PHONE_ID;
  if (!token || !phoneId) return null;
  return {
    token,
    phoneId,
    otpTemplate: process.env.META_WHATSAPP_TEMPLATE_OTP ?? "verification_code",
    bookingConfirmedTemplate: process.env.META_WHATSAPP_TEMPLATE_BOOKING_CONFIRMED ?? "booking_confirmed",
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
  return sendTemplate(toPhone, cfg.otpTemplate, [code], code);
}

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
