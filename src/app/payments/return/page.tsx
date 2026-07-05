"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { getWhatsAppUrl } from "@/lib/utils";

type PollState = "confirming" | "failed" | "processing" | "error";

function bookingMeta(ref: string): { label: string } {
  if (ref.startsWith("PKG-")) return { label: "package" };
  if (ref.startsWith("HTL-")) return { label: "hotel" };
  return { label: "tour" };
}

function ReturnInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams?.get("O") ?? "";

  const [state, setState] = useState<PollState>("confirming");
  const [bookingRef, setBookingRef] = useState(orderId);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const redirectedRef = useRef(false);

  const { label } = bookingMeta(bookingRef || orderId);

  useEffect(() => {
    if (!orderId) {
      setState("error");
      setErrorMsg("No order reference found.");
      return;
    }

    let polls = 0;
    const MAX_POLLS = 15; // 15 * 1s = 15s cap

    const check = async () => {
      polls++;
      try {
        const res = await fetch(`/api/bookings/status?ref=${encodeURIComponent(orderId)}`);
        const data = await res.json();

        if (data.error) throw new Error(data.error);

        const nextRef = data.bookingRef ?? orderId;
        setBookingRef(nextRef);

        if (data.status === "paid") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            router.replace(`/bookings/${nextRef}`);
          }
          return;
        }
        if (data.status === "failed") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setState("failed");
          return;
        }
        if (polls >= MAX_POLLS) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setState("processing");
        }
      } catch (e) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setErrorMsg(e instanceof Error ? e.message : "Verification failed");
        setState("error");
      }
    };

    check();
    intervalRef.current = setInterval(check, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [orderId, router]);

  if (state === "confirming") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)] animate-spin" />
          <div className="space-y-2">
            <p className="text-[22px] font-bold text-[var(--text-primary)]">Confirming your payment</p>
            <p className="text-[15px] text-[var(--text-secondary)]">
              Please don&apos;t close this page — we&apos;ll take you to your booking as soon as it&apos;s confirmed.
            </p>
          </div>
          {bookingRef && (
            <p className="text-[13px] font-mono text-[var(--text-tertiary)]">{bookingRef}</p>
          )}
        </div>
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
            href={getWhatsAppUrl(`Hi, I just made a payment (order: ${orderId}) but couldn't verify it. Can you help confirm my ${label} booking?`)}
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
            <p className="text-[20px] font-bold text-[var(--text-primary)]">Payment is still processing</p>
            <p className="text-[14px] text-[var(--text-secondary)] mt-2">
              Your bank is taking longer than usual to confirm. We&apos;ll email you the moment it clears, and your booking is already reserved.
            </p>
          </div>
          <p className="text-[13px] font-mono text-[var(--text-tertiary)]">{bookingRef}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href={`/bookings/${bookingRef}`}
              className="inline-flex h-11 px-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
            >
              View my booking
            </Link>
            <a
              href={getWhatsAppUrl(`Hi, I made a payment for ${label} booking ${bookingRef} and it's being processed. Can you confirm my booking?`)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 px-6 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Contact us on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  // failed
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
            href={`/bookings/${bookingRef}?payment=failed`}
            className="inline-flex h-11 px-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold hover:bg-[var(--primary-hover)] transition-colors"
          >
            Try Again
          </Link>
          <a
            href={getWhatsAppUrl(`Hi, I tried to pay for ${label} booking ${bookingRef} but the payment didn't go through. Can you help?`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 px-6 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-default)] text-[14px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
          >
            Contact us
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PaymentReturnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-16 h-16 rounded-full border-4 border-[var(--primary)]/20 border-t-[var(--primary)] animate-spin" />
      </div>
    }>
      <ReturnInner />
    </Suspense>
  );
}
