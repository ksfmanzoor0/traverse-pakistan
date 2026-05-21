import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const schema = z.object({
  bookingRef: z.string().min(1),
  contact: z.string().min(1), // email or phone
});

export async function POST(req: NextRequest) {
  const body = schema.safeParse(await req.json());
  if (!body.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { bookingRef, contact } = body.data;
  const supabase = getSupabaseAdmin();
  const c = contact.trim().toLowerCase();

  let found = false;

  if (bookingRef.startsWith("PKG-")) {
    const { data } = await supabase
      .from("package_bookings")
      .select("contact_email, contact_phone")
      .eq("booking_ref", bookingRef)
      .single();
    if (data) {
      found = data.contact_email?.toLowerCase() === c || data.contact_phone?.replace(/\s/g, "") === contact.replace(/\s/g, "");
    }
  } else if (bookingRef.startsWith("HTL-")) {
    const { data } = await supabase
      .from("hotel_bookings")
      .select("contact_email, contact_phone")
      .eq("booking_ref", bookingRef)
      .single();
    if (data) {
      found = data.contact_email?.toLowerCase() === c || data.contact_phone?.replace(/\s/g, "") === contact.replace(/\s/g, "");
    }
  } else {
    const { data } = await supabase
      .from("bookings")
      .select("contact_email, contact_phone")
      .eq("booking_ref", bookingRef)
      .single();
    if (data) {
      found = data.contact_email?.toLowerCase() === c || data.contact_phone?.replace(/\s/g, "") === contact.replace(/\s/g, "");
    }
  }

  if (!found) {
    return NextResponse.json({ error: "Booking not found or contact details do not match" }, { status: 404 });
  }

  return NextResponse.json({ verified: true });
}
