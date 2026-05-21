import { getResend, FROM } from "./resend";
import { bookingConfirmationHtml, bookingConfirmationText } from "./templates/bookingConfirmation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendBookingConfirmedViaWhatsApp, isWhatsAppConfigured } from "@/lib/whatsapp/cloud";
import { isSynthesizedEmail } from "@/lib/auth/phone";

function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return fromEnv || "https://traversepakistan.com";
}

interface BookingRecord {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  totalAmount: number;
  userId: string | null;
  bookingType: "tour" | "package" | "hotel";
  itemName: string;
  details: Record<string, string>;
}

async function loadBooking(bookingRef: string): Promise<BookingRecord | null> {
  const supabase = getSupabaseAdmin();

  if (bookingRef.startsWith("PKG-")) {
    const { data } = await supabase
      .from("package_bookings")
      .select("contact_name, contact_email, contact_phone, total_amount, package_slug, tier, departure_city, start_date, adults, user_id")
      .eq("booking_ref", bookingRef)
      .single();
    if (!data) return null;
    return {
      contactName: data.contact_name,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      totalAmount: data.total_amount,
      userId: (data.user_id as string | null) ?? null,
      bookingType: "package",
      itemName: data.package_slug,
      details: {
        Package: data.package_slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        Tier: data.tier.charAt(0).toUpperCase() + data.tier.slice(1),
        "Departure City": data.departure_city.charAt(0).toUpperCase() + data.departure_city.slice(1),
        ...(data.start_date ? { "Start Date": new Date(data.start_date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) } : {}),
        Adults: String(data.adults),
      },
    };
  }

  if (bookingRef.startsWith("HTL-")) {
    const { data } = await supabase
      .from("hotel_bookings")
      .select("contact_name, contact_email, contact_phone, total_amount, hotel_slug, checkin_date, checkout_date, nights, adults, children, user_id")
      .eq("booking_ref", bookingRef)
      .single();
    if (!data) return null;
    return {
      contactName: data.contact_name,
      contactEmail: data.contact_email,
      contactPhone: data.contact_phone,
      totalAmount: Number(data.total_amount),
      userId: (data.user_id as string | null) ?? null,
      bookingType: "hotel",
      itemName: data.hotel_slug,
      details: {
        Hotel: data.hotel_slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        "Check-in": data.checkin_date ? new Date(data.checkin_date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "-",
        "Check-out": data.checkout_date ? new Date(data.checkout_date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "-",
        Nights: String(data.nights),
        Guests: `${data.adults} adults${data.children ? `, ${data.children} children` : ""}`,
      },
    };
  }

  const { data } = await supabase
    .from("bookings")
    .select("contact_name, contact_email, contact_phone, total_amount, seats, user_id")
    .eq("booking_ref", bookingRef)
    .single();
  if (!data) return null;
  return {
    contactName: data.contact_name,
    contactEmail: data.contact_email,
    contactPhone: data.contact_phone,
    totalAmount: data.total_amount,
    userId: (data.user_id as string | null) ?? null,
    bookingType: "tour",
    itemName: "",
    details: { Seats: String(data.seats) },
  };
}

// Generates a magic-link URL that signs the user in and lands them on /bookings/[ref].
async function buildMagicLinkUrl(userId: string | null, bookingRef: string): Promise<string | null> {
  if (!userId) return null;
  try {
    const supabase = getSupabaseAdmin();
    const { data: userResult } = await supabase.auth.admin.getUserById(userId);
    const email = userResult?.user?.email;
    if (!email) return null;

    const { data: linkData, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error || !linkData?.properties?.hashed_token) return null;

    const next = encodeURIComponent(`/bookings/${bookingRef}`);
    return `${siteUrl()}/auth/callback?token_hash=${linkData.properties.hashed_token}&type=magiclink&next=${next}`;
  } catch (err) {
    console.error("[buildMagicLinkUrl] failed:", err);
    return null;
  }
}

export async function sendBookingConfirmation(bookingRef: string): Promise<void> {
  const record = await loadBooking(bookingRef);
  if (!record) return;

  const magicUrl = await buildMagicLinkUrl(record.userId, bookingRef);
  const viewUrl = magicUrl ?? `${siteUrl()}/bookings/${bookingRef}`;

  // Email (skip if contactEmail is synthesized — that means user gave phone only).
  const realEmail = record.contactEmail && !isSynthesizedEmail(record.contactEmail) ? record.contactEmail : null;
  if (realEmail) {
    try {
      await getResend().emails.send({
        from: FROM,
        to: realEmail,
        subject: `Booking Confirmed — ${bookingRef} | Traverse Pakistan`,
        html: bookingConfirmationHtml({ bookingRef, contactName: record.contactName, contactEmail: realEmail, bookingType: record.bookingType, itemName: record.itemName, totalAmount: record.totalAmount, details: record.details, viewUrl }),
        text: bookingConfirmationText({ bookingRef, contactName: record.contactName, contactEmail: realEmail, bookingType: record.bookingType, itemName: record.itemName, totalAmount: record.totalAmount, details: record.details, viewUrl }),
      });
    } catch (err) {
      console.error("[sendBookingConfirmation] email send failed:", err);
    }
  }

  // WhatsApp (always when phone is present and Cloud API is configured).
  if (record.contactPhone && isWhatsAppConfigured() && magicUrl) {
    try {
      await sendBookingConfirmedViaWhatsApp({
        toPhone: record.contactPhone,
        name: record.contactName,
        bookingRef,
        magicLinkPath: magicUrl,
      });
    } catch (err) {
      console.error("[sendBookingConfirmation] whatsapp send failed:", err);
    }
  }
}
