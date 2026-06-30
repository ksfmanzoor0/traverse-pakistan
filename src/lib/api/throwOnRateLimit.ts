/**
 * Inspect a fetch response for a 429 rate-limit hit and throw a user-friendly
 * Error if so. No-op when the response is anything else — caller continues
 * its normal `if (!res.ok)` handling.
 *
 * Use at the top of any client fetch that calls a route guarded by
 * `src/lib/ratelimit.ts` so the UI surfaces "too many attempts" instead of a
 * generic fault message.
 */
export function throwOnRateLimit(res: Response, action: string): void {
  if (res.status !== 429) return;
  const retryAfterRaw = res.headers.get("Retry-After");
  const retryAfter = retryAfterRaw ? Number(retryAfterRaw) : NaN;
  const wait = Number.isFinite(retryAfter) && retryAfter > 0
    ? ` Try again in ${retryAfter < 60 ? `${retryAfter}s` : `${Math.ceil(retryAfter / 60)} min`}.`
    : "";
  throw new Error(`Too many ${action}.${wait}`);
}
