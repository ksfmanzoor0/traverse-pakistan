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
  // Per-person flight (or bus) add-on cost resolved from tour_addons for the
  // chosen home city. Charged equally to adults + children (per seat, not
  // per-adult) and does not receive the group discount.
  addonPerPerson?: number;
}

export interface PricingBreakdown {
  basePrice: number;
  adultsSubtotal: number;
  childrenSubtotal: number;
  subtotal: number;
  singleSupplementTotal: number;
  groupDiscountPct: number;
  groupDiscountAmount: number;
  childDiscountPct: number;
  childUnitPrice: number;
  addonPerPerson: number;
  addonSubtotal: number;
  total: number;
  dueNow: number;
  dueLater: number;
  totalTravelers: number;
  currency: string;
}

const DEFAULT_CHILD_DISCOUNT_PCT = 0.5;
const DEFAULT_GROUP_DISCOUNT_TIERS: ReadonlyArray<{ minAdults: number; pct: number }> = [
  { minAdults: 3, pct: 0.05 },
  { minAdults: 6, pct: 0.1 },
];
// Group tours: 40% deposit to confirm the seat; balance due 30 days pre-departure.
export const TOUR_DEPOSIT_PCT = 0.4;

// Group discount is driven by adults only; children don't count. Tour-level
// overrides on `tour.groupDiscountTiers` (sorted ascending by minAdults) win;
// null/empty falls back to the default 3→5% / 6→10% ladder.
export function getGroupDiscountPct(
  adults: number,
  tiers?: ReadonlyArray<{ minAdults: number; pct: number }> | null,
): number {
  const effective = tiers && tiers.length > 0 ? tiers : DEFAULT_GROUP_DISCOUNT_TIERS;
  let pct = 0;
  for (const t of effective) {
    if (adults >= t.minAdults && t.pct > pct) pct = t.pct;
  }
  return pct;
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  const { tour, liveDeparture, adults, childCount, singleRooms, paymentPlan } = input;
  const singleOccupancyRooms = input.singleOccupancyRooms ?? 0;
  const addonPerPerson = input.addonPerPerson ?? 0;

  const basePrice = liveDeparture?.price ?? tour.pricing.base;

  // Twin + solo surcharges live on the departure row. Zero when no departure
  // is picked yet (initial paint) — the private-room steppers stay hidden.
  const twinSurcharge = liveDeparture?.twinPrice ?? 0;
  const soloSurcharge = liveDeparture?.singlePrice ?? 0;

  const childDiscountPct = tour.childDiscountPct ?? DEFAULT_CHILD_DISCOUNT_PCT;
  const childUnitPrice = Math.round(basePrice * (1 - childDiscountPct));
  const adultsSubtotal = basePrice * adults;
  const childrenSubtotal = childUnitPrice * childCount;
  const subtotal = adultsSubtotal + childrenSubtotal;

  const totalTravelers = adults + childCount;
  // Private-room surcharges (both stored per person):
  //  - Single occupancy: single_price per solo person (own room).
  //  - Couple / twin private: twin_price per person, ×2 per room.
  // Caller is responsible for enforcing that
  //   singleOccupancyRooms + 2 * singleRooms ≤ adults.
  const soloTotal = soloSurcharge * singleOccupancyRooms;
  const coupleTotal = twinSurcharge * singleRooms * 2;
  const singleSupplementTotal = soloTotal + coupleTotal;

  // Group discount applies to the adults subtotal only; children never trigger
  // or receive it.
  const groupDiscountPct = getGroupDiscountPct(adults, tour.groupDiscountTiers);
  const groupDiscountAmount = Math.round(adultsSubtotal * groupDiscountPct);

  const addonSubtotal = addonPerPerson * totalTravelers;

  const total = subtotal - groupDiscountAmount + singleSupplementTotal + addonSubtotal;
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
    childDiscountPct,
    childUnitPrice,
    addonPerPerson,
    addonSubtotal,
    total,
    dueNow,
    dueLater,
    totalTravelers,
    currency: "PKR",
  };
}
