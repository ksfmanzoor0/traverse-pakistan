import type { Metadata } from "next";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "About Traverse Pakistan — Pakistan's Highest-Rated Tour Operator",
  description:
    "Founded in Islamabad, Traverse Pakistan runs group and custom tours across Gilgit-Baltistan, Chitral, and beyond. 4.9★ from 1,300+ travelers. TripAdvisor Travelers' Choice 2025.",
  path: "/about",
  tags: ["about Traverse Pakistan", "Pakistan tour operator", "Islamabad tour company"],
});

const milestones = [
  { year: "2015", title: "Founded in Islamabad", description: "Started as a small team with a big dream — to showcase Pakistan's beauty to the world." },
  { year: "2018", title: "1,000+ Travelers", description: "Crossed 1,000 happy travelers milestone with perfect safety record." },
  { year: "2022", title: "#1 Rated in Islamabad", description: "Became the highest-rated tour operator in Islamabad on Google and Facebook." },
  { year: "2025", title: "TripAdvisor Award", description: "Won the TripAdvisor Travelers' Choice Award — top 10% globally." },
];

export default function AboutPage() {
  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "About Us" }]} />

        {/* Hero */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight">
              Pakistan&apos;s Highest-Rated Tourism Company
            </h1>
            <p className="text-lg text-[var(--text-tertiary)] mt-4 leading-relaxed">
              Traverse Pakistan is a full-service, one-stop travel booking platform covering tours, transport, hotels, and custom trip planning across all of Pakistan. We&apos;ve earned a 4.9★ rating across 1,300+ reviews by delivering unforgettable, safe, and well-organized travel experiences.
            </p>
            <div className="flex flex-wrap gap-6 mt-8">
              <div className="text-center">
                <span className="text-3xl font-extrabold text-[var(--primary)]">4.9★</span>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-1">Average Rating</p>
              </div>
              <div className="text-center">
                <span className="text-3xl font-extrabold text-[var(--primary)]">1,300+</span>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-1">Reviews</p>
              </div>
              <div className="text-center">
                <span className="text-3xl font-extrabold text-[var(--primary)]">98%</span>
                <p className="text-[13px] text-[var(--text-tertiary)] mt-1">Recommend</p>
              </div>
            </div>
          </div>
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
            <Image
              src="https://media.traversepakistan.com/about/hero.jpg"
              alt="Traverse Pakistan team"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>

        {/* Milestones */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-10 text-center">
            Our Journey
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {milestones.map((m) => (
              <div key={m.year} className="text-center p-6 bg-[var(--bg-subtle)] rounded-xl">
                <span className="text-3xl font-extrabold text-[var(--primary)]">{m.year}</span>
                <h3 className="text-[16px] font-bold text-[var(--text-primary)] mt-3">{m.title}</h3>
                <p className="text-[14px] text-[var(--text-tertiary)] mt-2">{m.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Values */}
        <section className="mt-20 bg-[var(--bg-dark)] text-white rounded-2xl p-8 sm:p-12">
          <h2 className="text-2xl font-bold mb-8 text-center">What We Stand For</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Safety First</h3>
              <p className="text-[14px] text-[var(--on-dark-secondary)] mt-2">Verified drivers, professional guides, and emergency support on every trip.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Passion for Pakistan</h3>
              <p className="text-[14px] text-[var(--on-dark-secondary)] mt-2">We exist to show the world how beautiful Pakistan truly is.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Responsible Tourism</h3>
              <p className="text-[14px] text-[var(--on-dark-secondary)] mt-2">Supporting local communities and preserving natural beauty for future generations.</p>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
