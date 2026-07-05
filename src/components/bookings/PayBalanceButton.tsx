"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { throwOnRateLimit } from "@/lib/api/throwOnRateLimit";

interface Props {
  bookingRef: string;
  balanceDue: number;
  amountPaid: number;
  totalAmount: number;
}

export function PayBalanceButton({ bookingRef, balanceDue, amountPaid, totalAmount }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssoData, setSsoData] = useState<{ ssoUrl: string; ssoParams: Record<string, string> } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset local state on bfcache restore (browser back from Alfa, tab reopen).
  // Otherwise loading stays true and the button reads "Redirecting…" forever.
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

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/alfa/initiate-balance", {
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

  return (
    <div className="p-4 border border-[var(--primary)]/30 bg-[var(--primary-light)] rounded-[var(--radius-md)] space-y-3">
      <div>
        <p className="text-[14px] font-bold text-[var(--text-primary)]">Balance due</p>
        <p className="text-[12px] text-[var(--text-secondary)] mt-1">
          Deposit of {formatPrice(amountPaid)} received. Pay the remaining {formatPrice(balanceDue)} to fully confirm your booking.
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-1 tabular-nums">
          Total {formatPrice(totalAmount)} · Paid {formatPrice(amountPaid)} · Balance {formatPrice(balanceDue)}
        </p>
      </div>
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="w-full h-11 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? "Redirecting to payment…" : `Pay balance · ${formatPrice(balanceDue)}`}
      </button>
      {error && <p className="text-[12px] text-[var(--error)] font-medium">{error}</p>}

      {ssoData && (
        <form ref={formRef} method="POST" action={ssoData.ssoUrl} className="hidden">
          {Object.entries(ssoData.ssoParams).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </div>
  );
}
