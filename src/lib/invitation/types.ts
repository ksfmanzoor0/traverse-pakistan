export type Traveler = {
  full_name: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  passport_expiry: string;
};

export type InvitationRequestInput = {
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  embassy_country: string;
  embassy_city: string;
  arrival_date: string;
  departure_date: string;
  destinations: string[];
  travelers: Traveler[];
};

export type InvitationRequestStatus =
  | "pending_payment"
  | "paid"
  | "issued"
  | "cancelled"
  | "failed";

export type InvitationRequest = InvitationRequestInput & {
  id: string;
  ref: string;
  status: InvitationRequestStatus;
  user_id: string | null;
  admin_notes: string | null;
  letter_data: Record<string, unknown> | null;
  letter_pdf_path: string | null;
  amount_pkr: number;
  amount_paid: number | null;
  payment_attempts: number;
  paid_at: string | null;
  issued_at: string | null;
  created_at: string;
  updated_at: string;
};
