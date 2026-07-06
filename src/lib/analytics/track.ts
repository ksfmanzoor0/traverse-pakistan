// Thin wrapper around window.gtag. No-op when GA4 isn't loaded (dev, preview
// without env var, ad-blockers) so callers never have to null-check.
//
// PII policy: never pass name/email/phone here. Standard GA4 e-commerce
// fields only (transaction_id, value, currency, item_id, item_name,
// item_variant, plus a small set of custom params like payment_plan).

type Gtag = (
  command: "event",
  action: string,
  params?: Record<string, unknown>,
) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

export type BookingType = "tour" | "package" | "hotel";

interface ViewItemParams {
  itemId: string;
  itemName: string;
  bookingType: BookingType;
  price?: number | null;
}

export function trackViewItem({ itemId, itemName, bookingType, price }: ViewItemParams): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "view_item", {
    currency: "PKR",
    value: price ?? undefined,
    items: [
      {
        item_id: itemId,
        item_name: itemName,
        item_category: bookingType,
      },
    ],
  });
}

interface BookingEventParams {
  bookingRef: string;
  bookingType: BookingType;
  itemId: string;
  itemName?: string | null;
  totalAmount: number;
  tier?: string | null;
  paymentPlan?: string | null;
}

export function trackAddToCart(p: BookingEventParams): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "add_to_cart", {
    currency: "PKR",
    value: p.totalAmount,
    booking_ref: p.bookingRef,
    payment_plan: p.paymentPlan ?? undefined,
    items: [
      {
        item_id: p.itemId,
        item_name: p.itemName ?? p.itemId,
        item_category: p.bookingType,
        item_variant: p.tier ?? undefined,
        price: p.totalAmount,
      },
    ],
  });
}

interface CheckoutEventParams extends BookingEventParams {
  chargeAmount: number;
}

export function trackBeginCheckout(p: CheckoutEventParams): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "begin_checkout", {
    currency: "PKR",
    value: p.chargeAmount,
    booking_ref: p.bookingRef,
    payment_plan: p.paymentPlan ?? undefined,
    items: [
      {
        item_id: p.itemId,
        item_name: p.itemName ?? p.itemId,
        item_category: p.bookingType,
        item_variant: p.tier ?? undefined,
        price: p.chargeAmount,
      },
    ],
  });
}

interface PurchaseEventParams extends BookingEventParams {
  amountPaid: number;
}

export function trackPurchase(p: PurchaseEventParams): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "purchase", {
    transaction_id: p.bookingRef,
    currency: "PKR",
    value: p.amountPaid,
    payment_plan: p.paymentPlan ?? undefined,
    items: [
      {
        item_id: p.itemId,
        item_name: p.itemName ?? p.itemId,
        item_category: p.bookingType,
        item_variant: p.tier ?? undefined,
        price: p.totalAmount,
      },
    ],
  });
}

interface PaymentFailedParams {
  bookingRef: string;
  bookingType: BookingType;
}

export function trackPaymentFailed(p: PaymentFailedParams): void {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "payment_failed", {
    booking_ref: p.bookingRef,
    item_category: p.bookingType,
  });
}
