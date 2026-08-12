"use client";

import { useState } from "react";
import type { Tour } from "@/types/tour";

interface FAQInlineProps {
  tour: Tour;
}

export function FAQInline({ tour }: FAQInlineProps) {
  const faqs = buildFaqs(tour);
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
          Common questions
        </p>
        <p className="text-[15px] font-bold text-[var(--text-primary)] mt-0.5">Before you book</p>
      </div>
      <div className="divide-y divide-[var(--border-default)]">
        {faqs.map((f, i) => (
          <FAQRow key={i} q={f.q} a={f.a} />
        ))}
      </div>
    </div>
  );
}

function FAQRow({ q, a }: { q: string; a: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-5 py-3.5 flex items-start justify-between gap-4 text-left cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <span className="text-[13px] font-semibold text-[var(--text-primary)] leading-snug">{q}</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`shrink-0 text-[var(--text-tertiary)] transition-transform mt-0.5 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 text-[13px] text-[var(--text-secondary)] leading-relaxed">{a}</div>
      )}
    </div>
  );
}

function buildFaqs(tour: Tour) {
  return [
    {
      q: "Will my card be charged now?",
      a: (
        <>
          No. Submitting this form reserves your seat. We confirm availability and send a secure payment
          link within 2 hours (bank transfer, JazzCash, or card). You can cancel free up to 7 days before
          departure.
        </>
      ),
    },
    {
      q: "What if the trip is cancelled?",
      a: (
        <>
          Very rare, but if weather or road conditions force cancellation, you get a full refund within
          7 business days or a free reschedule to any future departure.
        </>
      ),
    },
    {
      q: "Do I need to be super fit?",
      a: (
        <>
          {tour.knowBeforeYouGo.find((k) => /fitness/i.test(k)) ??
            "Moderate fitness is enough for most travellers. Let us know your activity level — we brief the guide to pace the group accordingly."}
        </>
      ),
    },
    {
      q: "Can my family / friends pay separately?",
      a: (
        <>
          Yes. Once we send the payment link, you can split it across cards or accounts. Just confirm
          on WhatsApp after reserving and we&apos;ll split the invoice.
        </>
      ),
    },
    {
      q: "What is included in the price?",
      a: (
        <ul className="space-y-1 list-disc pl-5">
          {tour.inclusions.slice(0, 4).map((i, idx) => (
            <li key={idx}>{i.text}</li>
          ))}
        </ul>
      ),
    },
  ];
}
