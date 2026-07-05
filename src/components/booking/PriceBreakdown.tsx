"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { TOUR_DEPOSIT_PCT, type PaymentPlan, type PricingBreakdown } from "./pricing";

interface PriceBreakdownProps {
  breakdown: PricingBreakdown;
  adults: number;
  childCount: number;
  paymentPlan: PaymentPlan;
  onPaymentPlanChange?: (plan: PaymentPlan) => void;
  allowInstallments?: boolean;
  defaultOpen?: boolean;
  depositPct?: number;
}

export function PriceBreakdown({
  breakdown,
  adults,
  childCount,
  paymentPlan,
  onPaymentPlanChange,
  allowInstallments = true,
  defaultOpen = false,
  depositPct = TOUR_DEPOSIT_PCT,
}: PriceBreakdownProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-primary)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
      >
        <div className="text-left">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
            Total price
          </p>
          <p className="text-[22px] font-bold text-[var(--text-primary)] tabular-nums leading-tight">
            {formatPrice(breakdown.total)}
          </p>
          {breakdown.groupDiscountPct > 0 && (
            <p className="text-[11px] text-[var(--success)] font-semibold mt-0.5">
              Group discount applied · {Math.round(breakdown.groupDiscountPct * 100)}% off
            </p>
          )}
        </div>
        <span
          className="text-[13px] font-semibold text-[var(--primary)] inline-flex items-center gap-1"
          aria-expanded={open}
        >
          {open ? "Hide" : "Show"} breakdown
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`transition-transform ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-2.5 border-t border-[var(--border-default)]">
          {adults > 0 && (
            <Row
              label={`${formatPrice(breakdown.basePrice)} × ${adults} adult${adults !== 1 ? "s" : ""}`}
              value={formatPrice(breakdown.adultsSubtotal)}
            />
          )}
          {childCount > 0 && (
            <Row
              label={`${formatPrice(Math.round(breakdown.basePrice * 0.5))} × ${childCount} child${childCount !== 1 ? "ren" : ""} (50% off)`}
              value={formatPrice(breakdown.childrenSubtotal)}
            />
          )}
          {breakdown.groupDiscountAmount > 0 && (
            <Row
              label={`Group discount · ${Math.round(breakdown.groupDiscountPct * 100)}% off`}
              value={`− ${formatPrice(breakdown.groupDiscountAmount)}`}
              tone="success"
            />
          )}
          {breakdown.singleSupplementTotal > 0 && (
            <Row
              label="Private room (separate occupancy)"
              value={formatPrice(breakdown.singleSupplementTotal)}
            />
          )}
          <div className="pt-3 mt-1 border-t border-[var(--border-default)] flex items-center justify-between text-[15px] font-bold">
            <span className="text-[var(--text-primary)]">Total</span>
            <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(breakdown.total)}</span>
          </div>

          {allowInstallments && onPaymentPlanChange && (
            <div className="mt-4 pt-4 border-t border-[var(--border-default)]">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--text-secondary)] mb-2">
                Payment plan
              </p>
              <div className="grid grid-cols-2 gap-2">
                <PlanTile
                  active={paymentPlan === "full"}
                  label="Pay in full"
                  sub={formatPrice(breakdown.total)}
                  onClick={() => onPaymentPlanChange("full")}
                />
                {(() => {
                  // Always preview the deposit split on this tile, regardless of
                  // the currently-selected plan (otherwise "Pay in full" mode
                  // would show total/0 on this tile, which is wrong).
                  const depositNow = Math.round(breakdown.total * depositPct);
                  const depositLater = breakdown.total - depositNow;
                  const pctLabel = `${Math.round(depositPct * 100)}% deposit`;
                  return (
                    <PlanTile
                      active={paymentPlan === "installments"}
                      label={pctLabel}
                      sub={`${formatPrice(depositNow)} now · ${formatPrice(depositLater)} later`}
                      onClick={() => onPaymentPlanChange("installments")}
                    />
                  );
                })()}
              </div>
              {paymentPlan === "installments" && (
                <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                  Balance due 30 days before departure. No interest, no fees.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success";
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-[13px]">
      <span className="text-[var(--text-secondary)] leading-snug">{label}</span>
      <span
        className={`font-medium tabular-nums shrink-0 ${
          tone === "success" ? "text-[var(--success)]" : "text-[var(--text-primary)]"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function PlanTile({
  active,
  label,
  sub,
  onClick,
}: {
  active: boolean;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left p-3 rounded-[var(--radius-sm)] border-2 transition-all cursor-pointer ${
        active
          ? "border-[var(--primary)] bg-[var(--primary-light)]"
          : "border-[var(--border-default)] bg-[var(--bg-primary)] hover:border-[var(--primary)]"
      }`}
    >
      <p className="text-[13px] font-bold text-[var(--text-primary)]">{label}</p>
      <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 tabular-nums">{sub}</p>
    </button>
  );
}
