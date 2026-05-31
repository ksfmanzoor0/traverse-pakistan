import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { getAllPackages, getPackageBySlug } from "@/services/package.service";
import { getWhatsAppUrl } from "@/lib/utils";
import { PackagePayButton } from "@/components/packages/PackagePayButton";
import { after } from "next/server";
import { stampBookingWithUser } from "@/lib/auth/stampBookingWithUser";
import { sendBookingConfirmation } from "@/lib/email/sendBookingConfirmation";
import { getSupabaseAdmin } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ref?: string; amount?: string }>;
}

export async function generateStaticParams() {
  const packages = await getAllPackages();
  return packages.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const pkg = await getPackageBySlug(slug);
  return { title: pkg ? `Booking received — ${pkg.name}` : "Booking received" };
}

async function getBookingSummary(ref: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("package_bookings")
    .select("contact_name, contact_email, contact_phone, tier, departure_city, start_date, adults, rooms, total_amount, payment_status")
    .eq("booking_ref", ref)
    .maybeSingle();
  return data;
}

export default async function PackageCheckoutSuccessPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { ref, amount: amountParam } = await searchParams;
  const pkg = await getPackageBySlug(slug);
  if (!pkg) notFound();

  let summary: Awaited<ReturnType<typeof getBookingSummary>> = null;

  if (ref) {
    // Silent signup (idempotent) + fire booking-received email/WhatsApp.
    // The send is deferred via after() — runs after the page response is
    // sent but keeps the lambda alive until it completes. Bare fire-and-
    // forget was being killed mid-flight by the serverless runtime.
    await stampBookingWithUser(ref);
    after(async () => {
      try {
        await sendBookingConfirmation(ref);
      } catch (err) {
        console.error("[package/success] sendBookingConfirmation failed:", err);
      }
    });
    summary = await getBookingSummary(ref);
  }

  const amount = amountParam ? Number(amountParam) : summary?.total_amount ? Number(summary.total_amount) : null;

  return (
    <div className="py-10 sm:py-16">
      <Container>
        <Breadcrumb
          items={[
            { label: "Holiday Packages", href: "/packages" },
            { label: pkg.name, href: `/packages/${pkg.slug}` },
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
            Pay now to secure your spot. Booking details have been sent to your email and WhatsApp.
          </p>
        </div>

        {/* Your trip widget */}
        {summary && (
          <div
            className="mt-6 max-w-[760px] mx-auto grid grid-cols-1 sm:grid-cols-[1fr_250px] gap-6 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden sm:h-[250px]"
            style={{ boxShadow: "var(--shadow-sm)" }}
          >
            <div className="p-6 order-2 sm:order-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)]">Your trip</p>
              <h2 className="text-[20px] font-bold text-[var(--text-primary)] tracking-tight mt-1">{pkg.name}</h2>
              <dl className="mt-5 grid grid-cols-2 gap-y-3 text-[13px]">
                {summary.start_date && (
                  <>
                    <dt className="text-[var(--text-tertiary)]">Start date</dt>
                    <dd className="text-right text-[var(--text-primary)] font-medium">
                      {new Date(summary.start_date).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                    </dd>
                  </>
                )}
                <dt className="text-[var(--text-tertiary)]">Duration</dt>
                <dd className="text-right text-[var(--text-primary)] font-medium">{pkg.duration} days</dd>
                <dt className="text-[var(--text-tertiary)]">Tier</dt>
                <dd className="text-right text-[var(--text-primary)] font-medium capitalize">{summary.tier}</dd>
                <dt className="text-[var(--text-tertiary)]">Departure</dt>
                <dd className="text-right text-[var(--text-primary)] font-medium capitalize">{summary.departure_city}</dd>
                <dt className="text-[var(--text-tertiary)]">Travellers</dt>
                <dd className="text-right text-[var(--text-primary)] font-medium">{summary.adults} adults · {summary.rooms} rooms</dd>
              </dl>
            </div>
            {pkg.images[0] && (
              <div className="relative w-full h-[220px] sm:h-full order-1 sm:order-2">
                <Image src={pkg.images[0].url} alt={pkg.name} fill className="object-cover" sizes="250px" />
              </div>
            )}
          </div>
        )}

        {/* Pay now */}
        {ref && amount && (
          <div className="mt-6 max-w-[760px] mx-auto">
            <PackagePayButton
              bookingRef={ref}
              amount={amount}
              paymentStatus={summary?.payment_status ?? "pending"}
            />
            <p className="mt-2 text-center text-[11px] text-[var(--text-tertiary)]">
              Secure card payment via Alfa Bank
            </p>
          </div>
        )}

        <div className="mt-6 max-w-[760px] mx-auto p-5 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-md)]">
          <h2 className="text-[14px] font-bold text-[var(--text-primary)] mb-3">What happens next</h2>
          <ol className="space-y-2.5 text-[13px] text-[var(--text-secondary)]">
            {[
              "Pay now via Debit or Credit Card, for Bank Transfer or Jazz Cash reach us on WhatsApp — or tap the link in your email/WhatsApp to come back anytime.",
              "Once paid, you receive the full itinerary, hotel details, and driver contact.",
              `We stay in touch via WhatsApp throughout your ${pkg.duration}-day journey.`,
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

        {/* Manage booking — POST to send magic link + grant view-tier access */}
        {ref && (
          <form action={`/api/bookings/${encodeURIComponent(ref)}/manage-init`} method="POST" className="mt-6 max-w-[760px] mx-auto">
            <button
              type="submit"
              className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors active:scale-[0.98] cursor-pointer"
            >
              Manage My Booking
            </button>
          </form>
        )}

        <div className="mt-6 max-w-[760px] mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a
            href={getWhatsAppUrl(`Hi! I just sent a booking request for ${pkg.name}${ref ? ` (ref ${ref})` : ""}. I have a question.`)}
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
            href="/packages"
            className="flex items-center justify-center h-[52px] border border-[var(--border-default)] text-[15px] font-bold text-[var(--text-primary)] rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            Browse more packages
          </Link>
        </div>
      </Container>
    </div>
  );
}
