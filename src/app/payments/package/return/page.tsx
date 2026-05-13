"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getWhatsAppUrl } from "@/lib/utils";

interface PaymentStatus {
  paid: boolean;
  bookingRef: string;
  transactionId: string | null;
  amount: string | null;
}

function ReturnInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("O") ?? "";
  const rc = searchParams?.get("RC") ?? "";
  const ts = searchParams?.get("TS") ?? "";

  const [status, setStatus] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setError("No order reference found.");
      setLoading(false);
      return;
    }
    fetch(`/api/payments/alfa/ipn?O=${encodeURIComponent(orderId)}&RC=${encodeURIComponent(rc)}&TS=${encodeURIComponent(ts)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStatus(data);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Verification failed"))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-secondary)] text-[15px]">Verifying your payment…</p>
      </div>
    );
  }

  if (error || !status) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--error)]/10 flex items-center justify-center">
            <Icon name="x" size="lg" className="text-[var(--error)]" />
          </div>
          <div>
            <p className="text-[20px] font-bold text-[var(--text-primary)]">Could not verify payment</p>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2">
              {error ?? "Please contact us with your order reference to confirm your booking."}
            </p>
          </div>
          <a
            href={getWhatsAppUrl(`Hi, I just made a payment (order: ${orderId}) but couldn't verify it. Can you help confirm my package booking?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 px-6 items-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            Contact us on WhatsApp
          </a>
        </div>
      </div>
    );
  }

  if (!status.paid) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--warning)]/10 flex items-center justify-center">
            <Icon name="x" size="lg" className="text-[var(--warning)]" />
          </div>
          <div>
            <p className="text-[20px] font-bold text-[var(--text-primary)]">Payment not completed</p>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2">
              Booking <span className="font-mono font-semibold">{status.bookingRef}</span> was not paid. If you believe this is an error, please contact us.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/packages"
              className="inline-flex h-11 px-6 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Browse packages
            </Link>
            <a
              href={getWhatsAppUrl(`Hi, I tried to pay for package booking ${status.bookingRef} but the payment didn't go through. Can you help?`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 px-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
            >
              Contact us
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--success)]/10 flex items-center justify-center">
          <Icon name="check" size="lg" className="text-[var(--success)]" />
        </div>
        <div>
          <p className="text-[22px] font-bold text-[var(--text-primary)]">Payment confirmed</p>
          <p className="text-[14px] text-[var(--text-secondary)] mt-2">
            Your package booking is confirmed. We&apos;ll send trip details to your email shortly.
          </p>
        </div>
        <div className="p-4 bg-[var(--bg-subtle)] rounded-[var(--radius-md)] text-left space-y-2.5">
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-tertiary)]">Booking ref</span>
            <span className="font-mono font-semibold text-[var(--text-primary)]">{status.bookingRef}</span>
          </div>
          {status.transactionId && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-tertiary)]">Transaction ID</span>
              <span className="font-mono font-semibold text-[var(--text-primary)]">{status.transactionId}</span>
            </div>
          )}
          {status.amount && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-tertiary)]">Amount paid</span>
              <span className="font-semibold text-[var(--text-primary)]">PKR {status.amount}</span>
            </div>
          )}
        </div>
        <Link
          href="/packages"
          className="inline-flex h-11 px-6 items-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
        >
          Browse more packages
        </Link>
      </div>
    </div>
  );
}

export default function PackagePaymentReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><p className="text-[var(--text-secondary)] text-[15px]">Loading…</p></div>}>
      <ReturnInner />
    </Suspense>
  );
}
