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

  // Missing token is almost always a widget-load issue on the client
  // (NEXT_PUBLIC_ site key not baked into the current bundle, script blocked
  // by an extension, slow network, race on submit). Blocking those cases
  // burns real customers. Honeypot + origin check still guard the route.
  // We log so we can see if abusers start exploiting this.
  if (!token) {
    console.warn("[turnstile] missing token on submit (widget likely did not render) — allowing through");
    return true;
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== "unknown") body.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      // Infrastructure failure on CF side — treat as fail-open so Cloudflare
      // outages do not break our funnel.
      console.error("[turnstile] siteverify HTTP", res.status, "— allowing through");
      return true;
    }
    const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!data.success) {
      // Cloudflare explicitly rejected the token (invalid, timed out, etc.).
      // This is the ONE case we block, because it is the signal of actual
      // automated abuse rather than a widget-load problem.
      console.error("[turnstile] verification failed:", data["error-codes"]);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[turnstile] verify threw:", err, "— allowing through");
    return true;
  }
}
