import { getResend, FROM } from "./resend";
import { bookingConfirmationHtml, bookingConfirmationText } from "./templates/bookingConfirmation";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function sendBookingConfirmation(bookingRef: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  let contactName = "";
  let contactEmail = "";
  let totalAmount = 0;
  let bookingType: "tour" | "package" | "hotel" = "tour";
  let itemName = "";
  let details: Record<string, string> = {};

  if (bookingRef.startsWith("PKG-")) {
    bookingType = "package";
    const { data } = await supabase
      .from("package_bookings")
      .select("contact_name, contact_email, total_amount, package_slug, tier, departure_city, start_date, adults")
      .eq("booking_ref", bookingRef)
      .single();
    if (!data) return;
    contactName = data.contact_name;
    contactEmail = data.contact_email;
    totalAmount = data.total_amount;
    itemName = data.package_slug;
    details = {
      Package: data.package_slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      Tier: data.tier.charAt(0).toUpperCase() + data.tier.slice(1),
      "Departure City": data.departure_city.charAt(0).toUpperCase() + data.departure_city.slice(1),
      ...(data.start_date ? { "Start Date": new Date(data.start_date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) } : {}),
      Adults: String(data.adults),
    };
  } else if (bookingRef.startsWith("HTL-")) {
    bookingType = "hotel";
    const { data } = await supabase
      .from("hotel_bookings")
      .select("contact_name, contact_email, total_amount, hotel_slug, checkin_date, checkout_date, nights, adults, children")
      .eq("booking_ref", bookingRef)
      .single();
    if (!data) return;
    contactName = data.contact_name;
    contactEmail = data.contact_email;
    totalAmount = Number(data.total_amount);
    itemName = data.hotel_slug;
    details = {
      Hotel: data.hotel_slug.replace(/-/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
      "Check-in": data.checkin_date ? new Date(data.checkin_date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "-",
      "Check-out": data.checkout_date ? new Date(data.checkout_date).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" }) : "-",
      Nights: String(data.nights),
      Guests: `${data.adults} adults${data.children ? `, ${data.children} children` : ""}`,
    };
  } else {
    bookingType = "tour";
    const { data } = await supabase
      .from("bookings")
      .select("contact_name, contact_email, total_amount, seats, departure_id")
      .eq("booking_ref", bookingRef)
      .single();
    if (!data) return;
    contactName = data.contact_name;
    contactEmail = data.contact_email;
    totalAmount = data.total_amount;
    details = {
      Seats: String(data.seats),
    };
  }

  if (!contactEmail) return;

  await getResend().emails.send({
    from: FROM,
    to: contactEmail,
    subject: `Booking Confirmed — ${bookingRef} | Traverse Pakistan`,
    html: bookingConfirmationHtml({ bookingRef, contactName, contactEmail, bookingType, itemName, totalAmount, details }),
    text: bookingConfirmationText({ bookingRef, contactName, contactEmail, bookingType, itemName, totalAmount, details }),
  });
}
