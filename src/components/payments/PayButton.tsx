"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { throwOnRateLimit } from "@/lib/api/throwOnRateLimit";

type Flow = "tour" | "package" | "hotel" | "balance";
type Variant = "inline" | "complete-card" | "balance-card";

interface Props {
  bookingRef: string;
  amount: number;
  flow: Flow;
  variant?: Variant;
  buttonLabel?: string;
  loadingLabel?: string;
  amountPaid?: number;
  totalAmount?: number;
  paymentStatus?: string;
  showFailedRetryHint?: boolean;
  showCardIcon?: boolean;
  size?: "md" | "lg";
}

function initiateRoute(flow: Flow): string {
  switch (flow) {
    case "package":
      return "/api/payments/alfa/initiate-package";
    case "hotel":
      return "/api/payments/alfa/initiate-hotel";
    case "balance":
      return "/api/payments/alfa/initiate-balance";
    default:
      return "/api/payments/alfa/initiate-tour";
  }
}

export function PayButton({
  bookingRef,
  amount,
  flow,
  variant = "inline",
  buttonLabel,
  loadingLabel = "Redirecting to payment…",
  amountPaid,
  totalAmount,
  paymentStatus,
  showFailedRetryHint = false,
  showCardIcon = false,
  size = "md",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssoData, setSsoData] = useState<{ ssoUrl: string; ssoParams: Record<string, string> } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Browser back / tab restore from Alfa restores this component from bfcache
  // with loading=true, so the button reads "Redirecting…" forever and the
  // customer can't retry. Reset when the page is shown from bfcache.
  useEffect(() => {
    function onPageShow(e: PageTransitionEvent) {
      if (e.persisted) {
        setLoading(false);
        setError(null);
        setSsoData(null);
      }
    }
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (flow === "package" && paymentStatus === "paid") {
    return (
      <div className="flex items-center gap-2 h-[52px] px-5 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-[var(--radius-sm)] text-[14px] font-semibold text-[var(--success)]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Payment confirmed
      </div>
    );
  }

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(initiateRoute(flow), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef }),
      });
      throwOnRateLimit(res, "payment attempts");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Payment initiation failed");
      setSsoData({ ssoUrl: data.ssoUrl, ssoParams: data.ssoParams });
      setTimeout(() => formRef.current?.submit(), 50);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  const label = buttonLabel ?? `Pay ${formatPrice(amount)}`;
  const height = size === "lg" ? "h-[52px]" : "h-11";
  const textSize = size === "lg" ? "text-[15px]" : "text-[14px]";

  const button = (
    <button
      type="button"
      onClick={handlePay}
      disabled={loading}
      className={`w-full ${height} flex items-center justify-center gap-2 bg-[var(--primary)] text-[var(--text-inverse)] ${textSize} font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer`}
    >
      {loading ? (
        <>
          {showCardIcon && (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          )}
          {loadingLabel}
        </>
      ) : (
        <>
          {showCardIcon && (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          )}
          {label}
        </>
      )}
    </button>
  );

  const errorEl = error ? (
    <p className="text-[12px] text-[var(--error)] font-medium text-center">{error}</p>
  ) : null;

  const failedHintEl = showFailedRetryHint && !error ? (
    <p className="text-[12px] text-[var(--text-tertiary)] text-center">
      Previous payment attempt failed — you can try again.
    </p>
  ) : null;

  const ssoForm = ssoData ? (
    <form ref={formRef} method="POST" action={ssoData.ssoUrl} className="hidden">
      {Object.entries(ssoData.ssoParams).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </form>
  ) : null;

  if (variant === "complete-card") {
    return (
      <div className="p-4 border border-[var(--warning)]/30 bg-[var(--warning)]/5 rounded-[var(--radius-md)] space-y-3">
        <div>
          <p className="text-[14px] font-bold text-[var(--text-primary)]">Complete your payment</p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1">
            Your booking is reserved but not yet paid. Complete payment to confirm.
          </p>
        </div>
        {button}
        {errorEl}
        {ssoForm}
      </div>
    );
  }

  if (variant === "balance-card") {
    return (
      <div className="p-4 border border-[var(--primary)]/30 bg-[var(--primary-light)] rounded-[var(--radius-md)] space-y-3">
        <div>
          <p className="text-[14px] font-bold text-[var(--text-primary)]">Balance due</p>
          <p className="text-[12px] text-[var(--text-secondary)] mt-1">
            Deposit of {formatPrice(amountPaid ?? 0)} received. Pay the remaining {formatPrice(amount)} to fully confirm your booking.
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1 tabular-nums">
            Total {formatPrice(totalAmount ?? 0)} · Paid {formatPrice(amountPaid ?? 0)} · Balance {formatPrice(amount)}
          </p>
        </div>
        {button}
        {errorEl}
        {ssoForm}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {button}
      {errorEl}
      {failedHintEl}
      {ssoForm}
    </div>
  );
}
