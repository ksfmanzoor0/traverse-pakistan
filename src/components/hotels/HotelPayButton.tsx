"use client";

import { useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { throwOnRateLimit } from "@/lib/api/throwOnRateLimit";

interface Props {
  bookingRef: string;
  amount: number;
  paymentStatus: string;
}

export function HotelPayButton({ bookingRef, amount, paymentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [ssoData, setSsoData] = useState<{ ssoUrl: string; ssoParams: Record<string, string> } | null>(null);

  if (paymentStatus === "paid") {
    return (
      <div className="flex items-center gap-2 h-[52px] px-5 bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-[var(--radius-sm)] text-[14px] font-semibold text-[var(--success)]">
        <Icon name="check" size="sm" />
        Payment confirmed
      </div>
    );
  }

  async function handlePay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/payments/alfa/initiate-hotel", {
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
    <div className="space-y-3">
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
      >
        {loading ? "Redirecting to payment…" : `Pay now — ${formatPrice(amount)}`}
      </button>
      {error && (
        <p className="text-[12px] text-[var(--error)] font-medium text-center">{error}</p>
      )}
      {paymentStatus === "failed" && !error && (
        <p className="text-[12px] text-[var(--text-tertiary)] text-center">Previous payment attempt failed — you can try again.</p>
      )}

      {/* Hidden SSO form auto-submitted after initiation */}
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
