import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { Button } from "@/components/ui/Button";
import { buildMetadata } from "@/lib/seo/metadata";
import { getWhatsAppUrl } from "@/lib/utils";

export const metadata: Metadata = buildMetadata({
  title: "Contact Traverse Pakistan — Phone, WhatsApp, Email & Office",
  description:
    "Reach Traverse Pakistan by phone (+92-321-6650670), WhatsApp, email (info@traversepakistan.com), or visit our office in E-11/1, Islamabad. Reply within 1 hour.",
  path: "/contact",
  tags: ["contact Traverse Pakistan", "Pakistan tour operator contact", "Islamabad travel agency"],
});

export default function ContactPage() {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "Contact" }]} />
        <div className="mt-6 mb-10">
          <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight">
            Get in Touch
          </h1>
          <p className="text-lg text-[var(--text-tertiary)] mt-2 max-w-xl">
            Have a question about a tour or want a custom itinerary? We&apos;d love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact info */}
          <div className="space-y-8">
            <div className="bg-[var(--bg-subtle)] rounded-xl p-6">
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Contact Information</h2>
              <div className="space-y-4 text-[15px]">
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0 mt-0.5">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Office Address</p>
                    <p className="text-[var(--text-secondary)]">Shop 01, Tower 10, MPCHS, E-11/1, Islamabad</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0 mt-0.5">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                  </svg>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Phone</p>
                    <a href="tel:+923216650670" className="text-[var(--primary)] hover:underline">+92-321-6650670</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0 mt-0.5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                  <div>
                    <p className="font-semibold text-[var(--text-primary)]">Email</p>
                    <a href="mailto:info@traversepakistan.com" className="text-[var(--primary)] hover:underline">info@traversepakistan.com</a>
                  </div>
                </div>
              </div>
            </div>

            {/* WhatsApp CTA */}
            <div className="bg-[#25D366]/10 border border-[#25D366]/30 rounded-xl p-6 text-center">
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Fastest Way to Reach Us</h3>
              <p className="text-[14px] text-[var(--text-tertiary)] mb-4">
                Get a response within minutes on WhatsApp
              </p>
              <a
                href={getWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 px-8 bg-[var(--whatsapp)] text-[var(--text-inverse)] font-semibold rounded-full hover:brightness-110 transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                Chat on WhatsApp
              </a>
            </div>
          </div>

          {/* Contact form */}
          <div className="bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-xl p-6 sm:p-8">
            <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6">Send Us a Message</h2>
            <form className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[13px] font-semibold text-[var(--text-secondary)] block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    placeholder="Your name"
                    className="w-full h-11 px-4 border border-[var(--border-default)] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="text-[13px] font-semibold text-[var(--text-secondary)] block mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    className="w-full h-11 px-4 border border-[var(--border-default)] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[var(--text-secondary)] block mb-1.5">Subject</label>
                <input
                  type="text"
                  placeholder="How can we help?"
                  className="w-full h-11 px-4 border border-[var(--border-default)] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-[var(--text-secondary)] block mb-1.5">Message</label>
                <textarea
                  rows={5}
                  placeholder="Tell us about your travel plans..."
                  className="w-full px-4 py-3 border border-[var(--border-default)] rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)] resize-none"
                />
              </div>
              <Button type="submit" size="lg" fullWidth>
                Send Message
              </Button>
            </form>
          </div>
        </div>
      </Container>
    </div>
  );
}
