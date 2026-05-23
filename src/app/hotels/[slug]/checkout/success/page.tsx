import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getAllHotels, getHotelBySlug } from "@/services/hotel.service";
import { getWhatsAppUrl } from "@/lib/utils";
import { HotelPayButton } from "@/components/hotels/HotelPayButton";
import { stampBookingWithUser } from "@/lib/auth/stampBookingWithUser";
import { mintLoginTokenForBooking } from "@/lib/auth/mintLoginToken";
import { sendBookingConfirmation } from "@/lib/email/sendBookingConfirmation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { AutoSignIn } from "@/components/auth/AutoSignIn";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string; amount?: string }>;
}

export async function generateStaticParams() {
  const hotels = await getAllHotels();
  return hotels.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const hotel = await getHotelBySlug(slug);
  return { title: hotel ? `Booking received — ${hotel.name}` : "Booking received" };
}

async function getBookingSummary(ref: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("hotel_bookings")
    .select("contact_name, contact_phone, checkin_date, checkout_date, nights, adults, children, total_amount, payment_status")
    .eq("booking_ref", ref)
    .maybeSingle();
  return data;
}

export default async function HotelCheckoutSuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref, amount: amountParam } = await searchParams;
  const hotel = await getHotelBySlug(slug);
  if (!hotel) notFound();

  let tokenHash: string | null = null;
  let summary: Awaited<ReturnType<typeof getBookingSummary>> = null;

  if (ref) {
    await stampBookingWithUser(ref);
    tokenHash = await mintLoginTokenForBooking(ref);
    sendBookingConfirmation(ref).catch((err) =>
      console.error("[hotel/success] sendBookingConfirmation failed:", err)
    );
    summary = await getBookingSummary(ref);
  }

  const amount = amountParam ? Number(amountParam) : summary?.total_amount ? Number(summary.total_amount) : null;

  return (
    <div className="py-10 sm:py-16">
      <AutoSignIn token={tokenHash} />
      <Container>
        <Breadcrumb
          items={[
            { label: "Hotels", href: "/hotels" },
            { label: hotel.name, href: `/hotels/${hotel.slug}` },
            { label: "Booking received" },
          ]}
        />

        <div className="mt-8 max-w-[680px] mx-auto text-center">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-5" style={{ background: "var(--primary-light)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-[var(--text-primary)] tracking-tight">
            Booking request received
          </h1>
          {ref && (
            <p className="mt-2 text-[13px] font-mono bg-[var(--bg-subtle)] border border-[var(--border-default)] inline-block px-3 py-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)]">
              Ref: <span className="font-bold text-[var(--text-primary)]">{ref}</span>
            </p>
          )}
          <p className="mt-3 text-[15px] text-[var(--text-secondary)] max-w-[480px] mx-auto">
            Pay now to confirm your room. Booking details have been sent to your email and WhatsApp.
          </p>
        </div>

        {ref && amount && (
          <div className="mt-8 max-w-[480px] mx-auto">
            <HotelPayButton
              bookingRef={ref}
              amount={amount}
              paymentStatus={summary?.payment_status ?? "pending"}
            />
          </div>
        )}

        {/* Inline booking summary */}
        {summary && (
          <div className="mt-6 max-w-[680px] mx-auto bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] px-5 py-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">Booking Summary</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
              <div className="flex justify-between gap-3"><span className="text-[var(--text-tertiary)]">Hotel</span><span className="font-semibold text-[var(--text-primary)] text-right">{hotel.name}</span></div>
              <div className="flex justify-between gap-3"><span className="text-[var(--text-tertiary)]">Nights</span><span className="font-semibold text-[var(--text-primary)] text-right">{summary.nights}</span></div>
              {summary.checkin_date && (
                <div className="flex justify-between gap-3"><span className="text-[var(--text-tertiary)]">Check-in</span><span className="font-semibold text-[var(--text-primary)] text-right">{new Date(summary.checkin_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span></div>
              )}
              {summary.checkout_date && (
                <div className="flex justify-between gap-3"><span className="text-[var(--text-tertiary)]">Check-out</span><span className="font-semibold text-[var(--text-primary)] text-right">{new Date(summary.checkout_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}</span></div>
              )}
              <div className="flex justify-between gap-3 sm:col-span-2"><span className="text-[var(--text-tertiary)]">Guests</span><span className="font-semibold text-[var(--text-primary)] text-right">{summary.adults} adults{summary.children ? `, ${summary.children} children` : ""}</span></div>
              <div className="flex justify-between gap-3 sm:col-span-2 pt-2 mt-1 border-t border-[var(--border-default)]"><span className="text-[var(--text-tertiary)]">Contact</span><span className="font-semibold text-[var(--text-primary)] text-right truncate">{summary.contact_name} · {summary.contact_phone}</span></div>
            </div>
          </div>
        )}

        {ref && (
          <div className="mt-4 max-w-[480px] mx-auto">
            <Link
              href={`/bookings/${ref}`}
              className="block text-center text-[13px] text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
            >
              Manage booking →
            </Link>
          </div>
        )}

        <div className="mt-8 max-w-[680px] mx-auto p-5 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-md)]">
          <h2 className="text-[14px] font-bold text-[var(--text-primary)] mb-3">What happens next</h2>
          <ol className="space-y-2.5 text-[13px] text-[var(--text-secondary)]">
            {[
              "Pay now via card, JazzCash, or bank transfer — or tap the link in your email/WhatsApp to come back anytime.",
              "Once paid, you receive a confirmed reservation with hotel contact details.",
              "We stay in touch via WhatsApp and are available throughout your stay.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-[var(--text-inverse)] text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-6 max-w-[680px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={getWhatsAppUrl(`Hi! I just sent a hotel booking request for ${hotel.name}${ref ? ` (ref ${ref})` : ""}. I have a question.`)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 h-[52px] bg-[var(--whatsapp)] text-white text-[15px] font-bold rounded-[var(--radius-sm)] hover:opacity-90 transition-opacity"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
            Chat on WhatsApp
          </a>
          <Link
            href="/hotels"
            className="flex items-center justify-center h-[52px] border border-[var(--border-default)] text-[15px] font-bold text-[var(--text-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            Browse more hotels
          </Link>
        </div>
      </Container>
    </div>
  );
}
