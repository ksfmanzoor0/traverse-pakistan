import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createViewCookie } from "@/lib/auth/viewCookie";
import { normalizePhone } from "@/lib/auth/phone";

const schema = z.object({
  bookingRef: z.string().min(3).max(40),
  contact: z.string().min(3).max(120),
});

type BookingTable = "package_bookings" | "hotel_bookings" | "bookings" | "invitation_requests";

function tableFromRef(ref: string): BookingTable {
  if (ref.startsWith("PKG-")) return "package_bookings";
  if (ref.startsWith("HTL-")) return "hotel_bookings";
  if (ref.startsWith("INV-")) return "invitation_requests";
  return "bookings";
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function fetchContact(table: BookingTable, ref: string): Promise<{ email: string | null; phone: string | null } | null> {
  const supabase = getSupabaseAdmin();
  if (table === "package_bookings") {
    const { data } = await supabase.from("package_bookings").select("contact_email, contact_phone").eq("booking_ref", ref).maybeSingle();
    return data ? { email: data.contact_email, phone: data.contact_phone } : null;
  }
  if (table === "hotel_bookings") {
    const { data } = await supabase.from("hotel_bookings").select("contact_email, contact_phone").eq("booking_ref", ref).maybeSingle();
    return data ? { email: data.contact_email, phone: data.contact_phone } : null;
  }
  if (table === "invitation_requests") {
    const { data } = await supabase.from("invitation_requests" as never).select("contact_email, contact_phone").eq("ref", ref).maybeSingle();
    const row = data as { contact_email: string | null; contact_phone: string | null } | null;
    return row ? { email: row.contact_email, phone: row.contact_phone } : null;
  }
  const { data } = await supabase.from("bookings").select("contact_email, contact_phone").eq("booking_ref", ref).maybeSingle();
  return data ? { email: data.contact_email, phone: data.contact_phone } : null;
}

// POST /api/bookings/view-grant
// Body: { bookingRef, contact }
// Validates that contact matches the booking's email or phone, then sets a
// per-booking signed cookie granting view+pay access. Manage actions still
// require the OTP step-up. Always returns 200 to prevent enumeration.
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ granted: false }, { status: 200 });

  const { bookingRef, contact } = parsed.data;
  const trimmed = contact.trim();

  const table = tableFromRef(bookingRef);
  const record = await fetchContact(table, bookingRef);
  if (!record) return NextResponse.json({ granted: false });

  let matched = false;
  if (looksLikeEmail(trimmed)) {
    // Phone-only bookings have a null/empty email — no email match possible.
    matched = !!record.email && record.email.toLowerCase() === trimmed.toLowerCase();
  } else {
    const normalized = normalizePhone(trimmed);
    matched = normalized.length > 0 && !!record.phone && normalizePhone(record.phone) === normalized;
  }

  if (!matched) return NextResponse.json({ granted: false });

  const cookie = createViewCookie(bookingRef);
  const res = NextResponse.json({ granted: true });
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: cookie.maxAge,
  });
  return res;
}
