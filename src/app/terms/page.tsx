import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description:
    "Booking terms, code of conduct, liability waivers, cancellation rules, and refund policies for Traverse Pakistan group and private tours.",
  path: "/terms",
});

const codeOfConduct = [
  "Garbage disposal must not pollute water sources or the natural environment.",
  "The host reserves the right to cancel the trip without prior notice for any reasons deemed appropriate by them.",
  "The company, trip leader, and organizers hold no responsibility for accidents arising from avalanches or unforeseen natural disasters.",
  "No liability is accepted for theft, loss, or damage to personal belongings.",
  "Weather, political conditions, and transport availability may necessitate itinerary changes; trip leaders decide on alternatives.",
  "Organizers can terminate a participant's trip for indiscipline without refund.",
  "Management decides on meals; prices may adjust if fuel costs increase by more than PKR 30/litre from the announcement date.",
];

export default function TermsPage() {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "Terms & Conditions" }]} />

        <div className="mt-8 max-w-3xl">
          <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-[var(--text-secondary)] leading-relaxed">
            Traverse Pakistan strictly follows these terms and conditions. You are required to read all
            of them before signing up for a trip with us. Participants receive an undertaking form at
            the start of each trip containing trip details and these T&amp;Cs, requiring a physical
            signature and thumb impression.
          </p>
        </div>

        <div className="mt-12 space-y-12 max-w-3xl">

          <section>
            <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-6">
              Code of Conduct
            </h2>
            <ol className="space-y-4">
              {codeOfConduct.map((item, i) => (
                <li key={i} className="flex gap-4">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-[13px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-[var(--text-secondary)] leading-relaxed pt-0.5">{item}</p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-6">
              Cancellation Policy
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-[var(--bg-subtle)] rounded-xl p-6">
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-4">Group / Public Tours</h3>
                <ul className="space-y-3 text-[14px]">
                  {[
                    { days: "14 days before", charge: "50% charges" },
                    { days: "7 days before", charge: "75% charges" },
                    { days: "3 days before", charge: "100% charges" },
                    { days: "1 day before", charge: "100% charges" },
                  ].map(({ days, charge }) => (
                    <li key={days} className="flex justify-between items-center gap-4">
                      <span className="text-[var(--text-secondary)]">{days}</span>
                      <span className="font-semibold text-[var(--text-primary)]">{charge}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[var(--bg-subtle)] rounded-xl p-6">
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-4">Custom / Private Tours</h3>
                <ul className="space-y-3 text-[14px]">
                  {[
                    { days: "30 days before", charge: "75% charges" },
                    { days: "7 days before", charge: "100% charges" },
                    { days: "3 days before", charge: "100% charges" },
                  ].map(({ days, charge }) => (
                    <li key={days} className="flex justify-between items-center gap-4">
                      <span className="text-[var(--text-secondary)]">{days}</span>
                      <span className="font-semibold text-[var(--text-primary)]">{charge}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[var(--bg-subtle)] rounded-xl p-6">
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-4">Transport Service</h3>
                <ul className="space-y-3 text-[14px]">
                  {[
                    { days: "14 days before", charge: "30% charges" },
                    { days: "7 days before", charge: "50% charges" },
                    { days: "3 days before", charge: "75% charges" },
                    { days: "1 day before", charge: "100% charges" },
                  ].map(({ days, charge }) => (
                    <li key={days} className="flex justify-between items-center gap-4">
                      <span className="text-[var(--text-secondary)]">{days}</span>
                      <span className="font-semibold text-[var(--text-primary)]">{charge}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-[var(--bg-subtle)] rounded-xl p-6">
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-4">Hotels &amp; Airline Tickets</h3>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                  Cancellation policies vary per hotel or airline and will be clearly shown before booking confirmation.
                </p>
              </div>
            </div>

            <div className="mt-6 p-5 border border-[var(--border-default)] rounded-xl">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">
                Flight Cancellation / Road Closure
              </h3>
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                In the event of a flight cancellation or road closure, clients may reschedule within 6 months or cancel. A minimum cancellation charge of 50% applies in either case.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-4">Refund Policy</h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              Approved refunds are processed within <strong className="text-[var(--text-primary)]">6 working weeks</strong> from the date of cancellation.
            </p>
          </section>

          <section className="bg-[var(--bg-dark)] rounded-2xl p-8 text-[var(--on-dark)]">
            <h2 className="text-[20px] font-bold mb-2">Questions about these terms?</h2>
            <p className="text-[var(--on-dark-secondary)] text-[14px] mb-5">
              Reach out to our team and we&apos;ll be happy to clarify anything.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="https://wa.me/923216650670"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#25D366] hover:bg-[#1fb855] text-white text-[14px] font-semibold rounded-full transition-colors"
              >
                WhatsApp Us
              </a>
              <a
                href="mailto:info@traversepakistan.com"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--on-dark-glass)] hover:bg-[var(--on-dark-glass-hover)] text-[var(--on-dark)] text-[14px] font-semibold rounded-full transition-colors"
              >
                info@traversepakistan.com
              </a>
            </div>
          </section>

        </div>
      </Container>
    </div>
  );
}
