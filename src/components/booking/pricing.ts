import type { Tour } from "@/types/tour";
import type { Departure, DepartureCity } from "@/types/booking";

export type PaymentPlan = "full" | "installments";

export interface PricingInput {
  tour: Tour;
  liveDeparture: Departure | null;
  departureCity: DepartureCity;
  adults: number;
  childCount: number;
  singleRooms: number; // couple/twin private rooms
  singleOccupancyRooms?: number; // solo travelers taking a private single room
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
// Group tours: 40% deposit to confirm the seat; balance due 30 days pre-departure.
export const TOUR_DEPOSIT_PCT = 0.4;

// Group discount is now driven by adults only; children don't count.
// 3 adults → 5%, 6 adults → 10%. Applied to the adults subtotal only.
export function getGroupDiscountPct(adults: number): number {
  if (adults >= 6) return 0.1;
  if (adults >= 3) return 0.05;
  return 0;
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const { tour, liveDeparture, departureCity, adults, childCount, singleRooms, paymentPlan } = input;
  const singleOccupancyRooms = input.singleOccupancyRooms ?? 0;

  const basePrice = liveDeparture?.price
    ?? (departureCity === "lahore"
      ? (tour.pricing.lahore ?? tour.pricing.islamabad)
      : tour.pricing.islamabad);

  const singleSupplement = liveDeparture?.singleSupplement ?? tour.pricing.singleSupplement ?? 0;

  const adultsSubtotal = basePrice * adults;
  const childrenSubtotal = Math.round(basePrice * (1 - CHILD_DISCOUNT_PCT)) * childCount;
  const subtotal = adultsSubtotal + childrenSubtotal;

  const totalTravelers = adults + childCount;
  // Private-room add-on (two independent rows):
  //  - Single occupancy: supplement × 3 per solo person (own room).
  //  - Couple / twin private: supplement × 2 per room (both share, no strangers).
  // Caller is responsible for enforcing that
  //   singleOccupancyRooms + 2 * singleRooms ≤ adults.
  const soloTotal = singleSupplement * 3 * singleOccupancyRooms;
  const coupleTotal = singleSupplement * 2 * singleRooms;
  const singleSupplementTotal = soloTotal + coupleTotal;

  // Group discount applies to the adults subtotal only; children never trigger
  // or receive it.
  const groupDiscountPct = getGroupDiscountPct(adults);
  const groupDiscountAmount = Math.round(adultsSubtotal * groupDiscountPct);

  const total = subtotal - groupDiscountAmount + singleSupplementTotal;
  const dueNow = paymentPlan === "installments" ? Math.round(total * TOUR_DEPOSIT_PCT) : total;
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
