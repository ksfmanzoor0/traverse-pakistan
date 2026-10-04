/**
 * Blocks POSTs that don't come from our own site.
 *
 * A form-spamming script running from an attacker's host will send an
 * `Origin` header pointing at that host (browsers set it automatically for
 * cross-origin POSTs); a naive curl script often omits Origin entirely. Both
 * are rejected. Real user submits from traversepakistan.com always carry a
 * matching Origin, so this is safe to gate on.
 *
 * Allow-list:
 *  - `NEXT_PUBLIC_SITE_URL` (canonical prod / sandbox host)
 *  - any `*.vercel.app` preview domain
 */
export function isAllowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin") ?? req.headers.get("referer");
  if (!origin) return false;

  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      const siteHost = new URL(
        /^https?:\/\//i.test(site) ? site : `https://${site}`,
      ).host.toLowerCase();
      if (host === siteHost) return true;
    } catch {
      /* fall through */
    }
  }

  if (host === "traversepakistan.com" || host === "www.traversepakistan.com") return true;
  if (host === "sandbox.traversepakistan.com") return true;
  if (host.endsWith(".vercel.app")) return true;

  return false;
}
