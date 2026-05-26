import { createHmac, timingSafeEqual } from "crypto";

const TTL_SECONDS = 60 * 60; // 1 hour view session per booking

interface ViewPayload {
  ref: string;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.AUTH_COOKIE_SECRET;
  if (!secret) throw new Error("AUTH_COOKIE_SECRET is not set");
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

function safeEq(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function viewCookieName(bookingRef: string): string {
  return `tp_v_${bookingRef}`;
}

export function createViewCookie(bookingRef: string): { name: string; value: string; maxAge: number } {
  const payload: ViewPayload = {
    ref: bookingRef,
    exp: Math.floor(Date.now() / 1000) + TTL_SECONDS,
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = sign(payloadStr);
  return {
    name: viewCookieName(bookingRef),
    value: `${payloadStr}.${sig}`,
    maxAge: TTL_SECONDS,
  };
}

export function verifyViewCookie(value: string | undefined, expectedRef: string): boolean {
  if (!value) return false;
  try {
    const [payloadStr, sig] = value.split(".");
    if (!payloadStr || !sig) return false;
    if (!safeEq(sign(payloadStr), sig)) return false;
    const payload = JSON.parse(Buffer.from(payloadStr, "base64url").toString()) as ViewPayload;
    if (payload.ref !== expectedRef) return false;
    if (payload.exp < Math.floor(Date.now() / 1000)) return false;
    return true;
  } catch {
    return false;
  }
}
