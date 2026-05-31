export type BookingStatus = "pending" | "confirmed" | "cancelled" | "refunded";
export type DepartureCity = "islamabad" | "lahore" | "karachi";

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
  price: number;
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
