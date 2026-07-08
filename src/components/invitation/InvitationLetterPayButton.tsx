"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function InvitationLetterPayButton({ ref, amountPkr }: { ref: string; amountPkr: number }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPay() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/payments/alfa/initiate-invitation-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start payment");

      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.ssoUrl;
      Object.entries(data.ssoParams as Record<string, string>).forEach(([k, v]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = k;
        input.value = v;
        form.appendChild(input);
      });
      document.body.appendChild(form);
      form.submit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" variant="primary" size="lg" onClick={onPay} disabled={pending} className="w-full sm:w-auto">
        {pending ? "Redirecting…" : `Pay PKR ${amountPkr.toLocaleString()} now`}
      </Button>
      {error && <p className="text-[12px] text-[var(--error)]">{error}</p>}
    </div>
  );
}
