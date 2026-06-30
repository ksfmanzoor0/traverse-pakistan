import { NextResponse } from "next/server";
import { sendQuoteRequestNotification, type QuoteRequestEmailInput } from "@/lib/email/sendQuoteRequest";
import { quoteNotifyLimiter, checkRateLimit, clientIp } from "@/lib/ratelimit";

// Best-effort team notification for a new quote / custom-tour request. The
// quote row is already persisted client-side (RLS-guarded insert); this route
// only emails the team. It always returns 200 so a mail failure never blocks
// the submitter's success state.
export async function POST(req: Request) {
  try {
    const rlHit = await checkRateLimit(quoteNotifyLimiter, clientIp(req));
    if (rlHit) return rlHit;
    const body = (await req.json()) as Partial<QuoteRequestEmailInput>;

    // Minimal guard so the endpoint can't be trivially used to relay arbitrary
    // mail — require a contact email and a summary, and clamp free text.
    if (!body?.contact?.email || !body?.displayName) {
      return NextResponse.json({ ok: true });
    }

    await sendQuoteRequestNotification({
      requestType: String(body.requestType ?? "custom").slice(0, 40),
      displayName: String(body.displayName).slice(0, 200),
      tier: body.tier ? String(body.tier).slice(0, 40) : null,
      preferredStartDate: body.preferredStartDate ?? null,
      preferredEndDate: body.preferredEndDate ?? null,
      adults: Number(body.adults) || 0,
      children: Number(body.children) || 0,
      rooms: Number(body.rooms) || 1,
      destinationName: body.destinationName ? String(body.destinationName).slice(0, 120) : null,
      interests: Array.isArray(body.interests) ? body.interests.slice(0, 20).map((s) => String(s).slice(0, 60)) : [],
      contact: {
        name: String(body.contact.name ?? "").slice(0, 120),
        email: String(body.contact.email).slice(0, 200),
        phone: String(body.contact.phone ?? "").slice(0, 40),
      },
      notes: body.notes ? String(body.notes).slice(0, 2000) : null,
    });
  } catch (err) {
    console.error("[quote/notify] failed", err);
  }
  return NextResponse.json({ ok: true });
}
