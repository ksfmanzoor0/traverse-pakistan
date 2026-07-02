"use client";

import { useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { throwOnRateLimit } from "@/lib/api/throwOnRateLimit";

interface Props {
  bookingRef: string;
  amount: number;
  type: "tour" | "package" | "hotel";
}

function initiateRoute(type: Props["type"]): string {
  if (type === "package") return "/api/payments/alfa/initiate-package";
  if (type === "hotel") return "/api/payments/alfa/initiate-hotel";
  return "/api/payments/alfa/initiate-tour";
}

export function CompletePaymentButton({ bookingRef, amount, type }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ssoData, setSsoData] = useState<{ ssoUrl: string; ssoParams: Record<string, string> } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(initiateRoute(type), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef, amount }),
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
    <div className="p-4 border border-[var(--warning)]/30 bg-[var(--warning)]/5 rounded-[var(--radius-md)] space-y-3">
      <div>
        <p className="text-[14px] font-bold text-[var(--text-primary)]">Complete your payment</p>
        <p className="text-[12px] text-[var(--text-secondary)] mt-1">
          Your booking is reserved but not yet paid. Complete payment to confirm.
        </p>
      </div>
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="w-full h-11 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? "Redirecting to payment…" : `Complete Payment · ${formatPrice(amount)}`}
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
