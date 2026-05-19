import type { DepartureCity, Participant } from "@/types/booking";
import type { PaymentPlan } from "./pricing";

export interface TravelerProfile extends Participant {
  isLead: boolean;
  ageGroup: "adult" | "child";
}

export interface CheckoutDraft {
  tourSlug: string;
  departureCity: DepartureCity;
  departureDate: string | null;
  adults: number;
  childCount: number;
  singleRooms: number;
  travelers: TravelerProfile[];
  contact: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  specialRequests: string;
  paymentPlan: PaymentPlan;
  step: 1 | 2 | 3 | 4;
  updatedAt: number;
}

export const DEFAULT_DRAFT = (tourSlug: string, city: DepartureCity = "islamabad"): CheckoutDraft => ({
  tourSlug,
  departureCity: city,
  departureDate: null,
  adults: 1,
  childCount: 0,
  singleRooms: 0,
  travelers: [],
  contact: { firstName: "", lastName: "", email: "", phone: "" },
  specialRequests: "",
  paymentPlan: "full",
  step: 1,
  updatedAt: Date.now(),
});
