import { getResend, FROM } from "./resend";
import { bookingConfirmationHtml, bookingConfirmationText } from "./templates/bookingConfirmation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { sendBookingReceivedViaWhatsApp, sendBookingConfirmedViaWhatsApp, isWhatsAppConfigured } from "@/lib/whatsapp/cloud";
import { isSynthesizedEmail } from "@/lib/auth/phone";

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  if (!raw) return "https://traversepakistan.com";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

type BookingTable = "package_bookings" | "hotel_bookings" | "bookings";

function tableFromRef(bookingRef: string): BookingTable {
  if (bookingRef.startsWith("PKG-")) return "package_bookings";
  if (bookingRef.startsWith("HTL-")) return "hotel_bookings";
  return "bookings";
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
  paymentStatus: "pending" | "paid" | "failed";
  confirmationSentAt: string | null;
}

async function loadBooking(bookingRef: string): Promise<BookingRecord | null> {
  const supabase = getSupabaseAdmin();

  if (bookingRef.startsWith("PKG-")) {
    const { data } = await supabase
      .from("package_bookings")
      .select("contact_name, contact_email, contact_phone, total_amount, package_slug, tier, departure_city, start_date, adults, user_id, payment_status, confirmation_sent_at")
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
      paymentStatus: ((data.payment_status as string) ?? "pending") as BookingRecord["paymentStatus"],
      confirmationSentAt: (data.confirmation_sent_at as string | null) ?? null,
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
      .select("contact_name, contact_email, contact_phone, total_amount, hotel_slug, checkin_date, checkout_date, nights, adults, children, user_id, payment_status, confirmation_sent_at")
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
      paymentStatus: ((data.payment_status as string) ?? "pending") as BookingRecord["paymentStatus"],
      confirmationSentAt: (data.confirmation_sent_at as string | null) ?? null,
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
    .select("contact_name, contact_email, contact_phone, total_amount, seats, user_id, status, confirmation_sent_at")
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
    paymentStatus: (data.status === "confirmed" ? "paid" : data.status === "cancelled" ? "failed" : "pending") as BookingRecord["paymentStatus"],
    confirmationSentAt: (data.confirmation_sent_at as string | null) ?? null,
    details: { Seats: String(data.seats) },
  };
}

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

    return `${siteUrl()}/m/${bookingRef}/${linkData.properties.hashed_token}`;
  } catch (err) {
    console.error("[buildMagicLinkUrl] failed:", err);
    return null;
  }
}

async function markConfirmationSent(bookingRef: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const table = tableFromRef(bookingRef);
  if (table === "package_bookings") {
    await supabase.from("package_bookings").update({ confirmation_sent_at: now }).eq("booking_ref", bookingRef);
  } else if (table === "hotel_bookings") {
    await supabase.from("hotel_bookings").update({ confirmation_sent_at: now }).eq("booking_ref", bookingRef);
  } else {
    await supabase.from("bookings").update({ confirmation_sent_at: now }).eq("booking_ref", bookingRef);
  }
}

// Idempotent — checks confirmation_sent_at and exits if already sent.
// Safe to call from success page renders, IPN, polling fallback, etc.
export async function sendBookingConfirmation(bookingRef: string): Promise<void> {
  const record = await loadBooking(bookingRef);
  if (!record) return;
  if (record.confirmationSentAt) return; // Already sent — do nothing.

  const magicUrl = await buildMagicLinkUrl(record.userId, bookingRef);
  const viewUrl = magicUrl ?? `${siteUrl()}/bookings/${bookingRef}`;

  const realEmail = record.contactEmail && !isSynthesizedEmail(record.contactEmail) ? record.contactEmail : null;
  if (realEmail) {
    try {
      await getResend().emails.send({
        from: FROM,
        to: realEmail,
        subject: `Booking received — ${bookingRef} | Traverse Pakistan`,
        html: bookingConfirmationHtml({ bookingRef, contactName: record.contactName, contactEmail: realEmail, bookingType: record.bookingType, itemName: record.itemName, totalAmount: record.totalAmount, details: record.details, viewUrl, paymentStatus: record.paymentStatus }),
        text: bookingConfirmationText({ bookingRef, contactName: record.contactName, contactEmail: realEmail, bookingType: record.bookingType, itemName: record.itemName, totalAmount: record.totalAmount, details: record.details, viewUrl, paymentStatus: record.paymentStatus }),
      });
    } catch (err) {
      console.error("[sendBookingConfirmation] email send failed:", err);
    }
  }

  if (record.contactPhone && isWhatsAppConfigured() && magicUrl) {
    await sendBookingReceivedViaWhatsApp({
      toPhone: record.contactPhone,
      name: record.contactName,
      bookingRef,
      magicLinkPath: magicUrl,
    });
  }

  // Mark sent regardless of partial failures — we don't want to spam on retry.
  await markConfirmationSent(bookingRef).catch(() => {});
}

// Fires when payment confirms (IPN or polling flip). Caller (markBooking)
// guards by transition so this fires once per pending→paid edge.
// Sends a separate "your booking is confirmed" email + WhatsApp, with a fresh
// magic link, status-aware email template renders the Confirmed copy.
export async function sendPaymentConfirmation(bookingRef: string): Promise<void> {
  const record = await loadBooking(bookingRef);
  if (!record) return;

  const magicUrl = await buildMagicLinkUrl(record.userId, bookingRef);
  const viewUrl = magicUrl ?? `${siteUrl()}/bookings/${bookingRef}`;

  const realEmail = record.contactEmail && !isSynthesizedEmail(record.contactEmail) ? record.contactEmail : null;
  if (realEmail) {
    try {
      await getResend().emails.send({
        from: FROM,
        to: realEmail,
        subject: `Booking confirmed — ${bookingRef} | Traverse Pakistan`,
        html: bookingConfirmationHtml({ bookingRef, contactName: record.contactName, contactEmail: realEmail, bookingType: record.bookingType, itemName: record.itemName, totalAmount: record.totalAmount, details: record.details, viewUrl, paymentStatus: record.paymentStatus }),
        text: bookingConfirmationText({ bookingRef, contactName: record.contactName, contactEmail: realEmail, bookingType: record.bookingType, itemName: record.itemName, totalAmount: record.totalAmount, details: record.details, viewUrl, paymentStatus: record.paymentStatus }),
      });
    } catch (err) {
      console.error("[sendPaymentConfirmation] email send failed:", err);
    }
  }

  if (record.contactPhone && isWhatsAppConfigured() && magicUrl) {
    try {
      await sendBookingConfirmedViaWhatsApp({
        toPhone: record.contactPhone,
        name: record.contactName,
        bookingRef,
        magicLinkPath: magicUrl,
      });
    } catch (err) {
      console.error("[sendPaymentConfirmation] whatsapp send failed:", err);
    }
  }
}
