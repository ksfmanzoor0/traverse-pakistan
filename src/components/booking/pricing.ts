import type { Tour } from "@/types/tour";
import type { Departure, DepartureCity } from "@/types/booking";

export type PaymentPlan = "full" | "installments";

export interface PricingInput {
  tour: Tour;
  liveDeparture: Departure | null;
  departureCity: DepartureCity;
  adults: number;
  childCount: number;
  singleRooms: number;
  paymentPlan: PaymentPlan;
}

export interface PricingBreakdown {
  basePrice: number;
  adultsSubtotal: number;
  childrenSubtotal: number;
  subtotal: number;
  singleSupplementTotal: number;
  groupDiscountPct: number;
  groupDiscountAmount: number;
  total: number;
  dueNow: number;
  dueLater: number;
  totalTravelers: number;
  currency: string;
}

const CHILD_DISCOUNT_PCT = 0.5;
const INSTALLMENT_DEPOSIT_PCT = 0.2;

export function getGroupDiscountPct(totalTravelers: number): number {
  if (totalTravelers >= 8) return 0.15;
  if (totalTravelers >= 4) return 0.1;
  return 0;
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const { tour, liveDeparture, departureCity, adults, childCount, singleRooms, paymentPlan } = input;

  const basePrice = liveDeparture?.price
    ?? (departureCity === "lahore"
      ? (tour.pricing.lahore ?? tour.pricing.islamabad)
      : tour.pricing.islamabad);

  const singleSupplement = liveDeparture?.singleSupplement ?? tour.pricing.singleSupplement ?? 0;

  const adultsSubtotal = basePrice * adults;
  const childrenSubtotal = Math.round(basePrice * (1 - CHILD_DISCOUNT_PCT)) * childCount;
  const subtotal = adultsSubtotal + childrenSubtotal;

  const totalTravelers = adults + childCount;
  // Private-room add-on:
  //  - Solo traveler (1 adult) opting for a private room: supplement × 3
  //    (they lose the twin-sharing baseline entirely).
  //  - 2+ travelers: each private room is twin-occupancy, cost = supplement × 2.
  //    Max rooms = floor(travelers / 2).
  let singleSupplementTotal = 0;
  if (totalTravelers === 1) {
    singleSupplementTotal = singleRooms > 0 ? singleSupplement * 3 : 0;
  } else if (totalTravelers >= 2) {
    const maxPrivateRooms = Math.floor(totalTravelers / 2);
    const billableRooms = Math.min(singleRooms, maxPrivateRooms);
    singleSupplementTotal = singleSupplement * 2 * billableRooms;
  }

  const groupDiscountPct = getGroupDiscountPct(totalTravelers);
  const groupDiscountAmount = Math.round(subtotal * groupDiscountPct);

  const total = subtotal - groupDiscountAmount + singleSupplementTotal;
  const dueNow = paymentPlan === "installments" ? Math.round(total * INSTALLMENT_DEPOSIT_PCT) : total;
  const dueLater = total - dueNow;

  return {
    basePrice,
    adultsSubtotal,
    childrenSubtotal,
    subtotal,
    singleSupplementTotal,
    groupDiscountPct,
    groupDiscountAmount,
    total,
    dueNow,
    dueLater,
    totalTravelers,
    currency: liveDeparture ? "PKR" : "PKR",
  };
}
