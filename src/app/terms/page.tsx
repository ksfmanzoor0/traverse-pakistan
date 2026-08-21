import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { buildMetadata } from "@/lib/seo/metadata";
import { getTerms } from "@/services/terms.service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Conditions",
  description:
    "Booking terms, code of conduct, liability waivers, cancellation rules, and refund policies for Traverse Pakistan group and private tours.",
  path: "/terms",
});

export default async function TermsPage() {
  const terms = await getTerms();
  const cancellationBlocks: {
    title: string;
    rows: { days: string; charge: string }[];
  }[] = [
    { title: "Group / Public Tours", rows: terms.cancellation.group },
    { title: "Custom / Private Tours", rows: terms.cancellation.private },
    { title: "Transport Service", rows: terms.cancellation.transport },
  ];

  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "Terms & Conditions" }]} />

        <div className="mt-8 max-w-3xl">
          <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-[var(--text-secondary)] leading-relaxed">
            {terms.intro}
          </p>
        </div>

        <div className="mt-12 space-y-12 max-w-3xl">
          <section>
            <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-6">
              Code of Conduct
            </h2>
            <ol className="space-y-4">
              {terms.codeOfConduct.map((item, i) => (
                <li key={i} className="flex gap-4">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-[var(--primary-light)] text-[var(--primary)] text-[13px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-[var(--text-secondary)] leading-relaxed pt-0.5">
                    {item}
                  </p>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-6">
              Cancellation Policy
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {cancellationBlocks.map(({ title, rows }) => (
                <div key={title} className="bg-[var(--bg-subtle)] rounded-xl p-6">
                  <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-4">
                    {title}
                  </h3>
                  <ul className="space-y-3 text-[14px]">
                    {rows.map((r, i) => (
                      <li
                        key={`${r.days}-${i}`}
                        className="flex justify-between items-center gap-4"
                      >
                        <span className="text-[var(--text-secondary)]">{r.days}</span>
                        <span className="font-semibold text-[var(--text-primary)]">
                          {r.charge}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}

              <div className="bg-[var(--bg-subtle)] rounded-xl p-6">
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-4">
                  Hotels &amp; Airline Tickets
                </h3>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                  {terms.cancellation.hotelsAirlinesNote}
                </p>
              </div>
            </div>

            <div className="mt-6 p-5 border border-[var(--border-default)] rounded-xl">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">
                Flight Cancellation / Road Closure
              </h3>
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                {terms.flightCancellation}
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-[22px] font-bold text-[var(--text-primary)] mb-4">
              Refund Policy
            </h2>
            <p className="text-[var(--text-secondary)] leading-relaxed">
              {terms.refund}
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
