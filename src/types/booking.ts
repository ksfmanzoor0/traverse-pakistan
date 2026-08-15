export type BookingStatus = "pending" | "confirmed" | "cancelled" | "refunded" | "deposit_paid";
export type DepartureCity = "islamabad" | "lahore" | "karachi" | "skardu";

export interface Departure {
  id: string;
  tourSlug: string;
  departureDate: string;
  endDate: string | null;
  departureCity: DepartureCity | null;
  maxSeats: number;
  seatsBooked: number;
  seatsAvailable: number;
  status: "open" | "closed" | "cancelled";
  /** Per-person base fare (group / triple / quad share). */
  price: number;
  /** Surcharge PER twin private room (2 friends alone). Falls back to single_supplement * 2. */
  twinPrice: number;
  /** Surcharge PER solo person (1 alone in a room). Falls back to single_supplement * 3. */
  singlePrice: number;
  /** @deprecated readers should prefer twinPrice + singlePrice. */
  singleSupplement: number | null;
}

export interface Participant {
  fullName?: string;
  cnicOrPassport?: string;
  dateOfBirth?: string;
  dietary?: string;
  emergencyContact?: string;
}

export interface CreateBookingInput {
  departureId: string;
  seats: number;
  singleRooms: number;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  participants: Participant[];
  notes?: string;
  submitUuid?: string;
  paymentPlan?: "full" | "installments";
}

export interface BookingSummary {
  bookingId: string;
  bookingRef: string;
  totalAmount: number;
}

export interface Booking {
  id: string;
  bookingRef: string;
  departureId: string;
  seats: number;
  singleRooms: number;
  totalAmount: number;
  currency: string;
  status: BookingStatus;
  contact: {
    name: string;
    email: string;
    phone: string;
  };
  notes: string | null;
  createdAt: string;
}
