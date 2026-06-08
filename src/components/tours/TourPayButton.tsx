"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";

interface TourPayButtonProps {
  bookingRef: string;
  amount: number;
  plan?: "full" | "installments";
}

export function TourPayButton({ bookingRef, amount, plan = "full" }: TourPayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/payments/alfa/initiate-tour", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingRef, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Payment initiation failed");

      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.ssoUrl;
      for (const [key, value] of Object.entries(data.ssoParams as Record<string, string>)) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      }
      document.body.appendChild(form);
      form.submit();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment initiation failed.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className="flex items-center justify-center gap-2 h-[52px] w-full bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-wait cursor-pointer"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
            Pay {formatPrice(amount)} now
          </>
        )}
      </button>
      {error && (
        <p className="mt-2 text-[12px] text-[var(--error)] text-center">{error}</p>
      )}
    </div>
  );
}
