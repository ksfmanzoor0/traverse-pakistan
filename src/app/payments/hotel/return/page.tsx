"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getWhatsAppUrl } from "@/lib/utils";

type PollState = "loading" | "paid" | "failed" | "processing" | "error";

function ReturnInner() {
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("O") ?? "";

  const [state, setState] = useState<PollState>("loading");
  const [bookingRef, setBookingRef] = useState(orderId);
  const [amount, setAmount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!orderId) {
      setState("error");
      setErrorMsg("No order reference found.");
      return;
    }

    let polls = 0;
    const MAX_POLLS = 10;

    const check = async () => {
      polls++;
      try {
        const res = await fetch(`/api/bookings/status?ref=${encodeURIComponent(orderId)}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        setBookingRef(data.bookingRef ?? orderId);
        setAmount(data.amount ?? null);

        if (data.status === "paid") {
          clearInterval(intervalRef.current!);
          setState("paid");
          return;
        }
        if (data.status === "failed") {
          clearInterval(intervalRef.current!);
          setState("failed");
          return;
        }
        if (polls >= MAX_POLLS) {
          clearInterval(intervalRef.current!);
          setState("processing");
        }
      } catch (e) {
        clearInterval(intervalRef.current!);
        setErrorMsg(e instanceof Error ? e.message : "Verification failed");
        setState("error");
      }
    };

    check();
    intervalRef.current = setInterval(check, 1500);
    return () => clearInterval(intervalRef.current!);
  }, [orderId]);

  if (state === "loading") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-secondary)] text-[15px]">Confirming your payment…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--error)]/10 flex items-center justify-center">
            <Icon name="x" size="lg" className="text-[var(--error)]" />
          </div>
          <div>
            <p className="text-[20px] font-bold text-[var(--text-primary)]">Could not verify payment</p>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2">
              {errorMsg ?? "Please contact us with your order reference to confirm your booking."}
            </p>
          </div>
          <a
            href={getWhatsAppUrl(`Hi, I just made a payment (order: ${orderId}) but couldn't verify it. Can you help confirm my hotel booking?`)}
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

  if (state === "processing") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--warning)]/10 flex items-center justify-center">
            <Icon name="calendar" size="lg" className="text-[var(--warning)]" />
          </div>
          <div>
            <p className="text-[20px] font-bold text-[var(--text-primary)]">Payment is being processed</p>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2">
              Your payment is being confirmed. You&apos;ll receive a booking confirmation email shortly. If you don&apos;t hear from us within an hour, please contact us.
            </p>
          </div>
          <p className="text-[13px] font-mono text-[var(--text-tertiary)]">{bookingRef}</p>
          <a
            href={getWhatsAppUrl(`Hi, I made a payment for hotel booking ${bookingRef} and it's being processed. Can you confirm my booking?`)}
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

  if (state === "failed") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-5">
          <div className="w-16 h-16 mx-auto rounded-full bg-[var(--warning)]/10 flex items-center justify-center">
            <Icon name="x" size="lg" className="text-[var(--warning)]" />
          </div>
          <div>
            <p className="text-[20px] font-bold text-[var(--text-primary)]">Payment not completed</p>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2">
              Booking <span className="font-mono font-semibold">{bookingRef}</span> was not paid. If you believe this is an error, please contact us.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/hotels"
              className="inline-flex h-11 px-6 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Browse hotels
            </Link>
            <a
              href={getWhatsAppUrl(`Hi, I tried to pay for hotel booking ${bookingRef} but the payment didn't go through. Can you help?`)}
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
            Your hotel booking is confirmed. We&apos;ll send reservation details to your email shortly.
          </p>
        </div>
        <div className="p-4 bg-[var(--bg-subtle)] rounded-[var(--radius-md)] text-left space-y-2.5">
          <div className="flex justify-between text-[13px]">
            <span className="text-[var(--text-tertiary)]">Booking ref</span>
            <span className="font-mono font-semibold text-[var(--text-primary)]">{bookingRef}</span>
          </div>
          {amount && (
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--text-tertiary)]">Amount paid</span>
              <span className="font-semibold text-[var(--text-primary)]">PKR {amount.toLocaleString()}</span>
            </div>
          )}
        </div>
        <Link
          href="/hotels"
          className="inline-flex h-11 px-6 items-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
        >
          Browse more hotels
        </Link>
      </div>
    </div>
  );
}

export default function HotelPaymentReturnPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center"><p className="text-[var(--text-secondary)] text-[15px]">Loading…</p></div>}>
      <ReturnInner />
    </Suspense>
  );
}
