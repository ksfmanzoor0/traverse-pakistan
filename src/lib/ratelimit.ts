import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * Rate limiters for sensitive API routes (OTP send, payment initiate, quote
 * notify). Uses Upstash Redis via REST so we work from edge + node runtimes
 * without a long-lived connection.
 *
 * Configuration: set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
 * env vars. When EITHER is missing the helpers below FAIL OPEN — i.e. the
 * request is allowed through and we log a one-time warning. That keeps booking
 * + auth working during a Redis outage or in environments (preview branches,
 * local dev) where the operator hasn't provisioned Upstash yet. The trade-off
 * is intentional: rate limiting is a defence-in-depth measure, not the only
 * line of defence — Alfa's gateway, Supabase RLS, and the OTP throttle inside
 * Supabase auth all enforce their own limits server-side regardless.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  console.warn(
    "[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — " +
      "rate limiting is DISABLED. Set the env vars in Vercel to enable.",
  );
}

/**
 * OTP send: 5 per 10 minutes per identifier (email/phone) is generous enough
 * for normal "didn't get the code, resend" retries while making OTP-bombing
 * attacks costly. We key on the identifier rather than IP because attackers
 * rotate IPs cheaply but the victim's phone/email is the actual abuse target.
 */
export const otpSendLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "10 m"),
      prefix: "rl:otp-send",
      analytics: false,
    })
  : null;

/**
 * Payment initiate: 10 per minute per IP. Real users click "Pay" maybe once
 * or twice; bots scraping Alfa redirect URLs would burst far above this.
 */
export const paymentInitiateLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      prefix: "rl:pay-init",
      analytics: false,
    })
  : null;

/**
 * Quote-request form: 5 per hour per IP. Quote requests fan out to email +
 * WhatsApp; uncapped, the form is a free spam loudspeaker.
 */
export const quoteNotifyLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      prefix: "rl:quote-notify",
      analytics: false,
    })
  : null;

/**
 * Extract the caller's IP for keying. Vercel sets `x-forwarded-for`; the
 * left-most token is the original client. Falls back to a constant so we
 * never key on `undefined` (which would collapse every caller into a single
 * bucket — the opposite of what we want).
 */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  return real ?? "unknown";
}

/**
 * Helper: returns `null` when the request is allowed, or a ready-to-return
 * `Response` (429 with Retry-After) when the limit is hit. Fail-open when
 * `limiter` is null (no Redis configured).
 */
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<Response | null> {
  if (!limiter) return null;
  const { success, reset } = await limiter.limit(identifier);
  if (success) return null;
  const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again shortly." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSec),
      },
    },
  );
}
