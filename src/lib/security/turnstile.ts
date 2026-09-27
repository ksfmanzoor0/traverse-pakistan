/**
 * Cloudflare Turnstile server-side verification.
 *
 * Frontend renders the widget with the site key and submits the resulting
 * token; the server calls siteverify with the secret + token before trusting
 * the request. When the secret env var is unset (local dev, previews) this
 * FAILS OPEN so the form still works — matches the ratelimit.ts pattern.
 *
 * Env vars:
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY  — public, safe to ship to the browser
 *   TURNSTILE_SECRET_KEY            — server-only
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.warn("[turnstile] TURNSTILE_SECRET_KEY not set — verification skipped");
    }
    return true;
  }

  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      console.error("[turnstile] siteverify HTTP", res.status);
      return false;
    }
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      console.error("[turnstile] verification failed:", data["error-codes"]);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[turnstile] verify threw:", err);
    return false;
  }
}
