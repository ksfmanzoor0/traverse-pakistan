export type Traveler = {
  surname: string;
  first_name: string;
  date_of_birth: string;
  nationality: string;
  passport_number: string;
  passport_expiry: string;
};

/**
 * Legacy jsonb rows stored a single `full_name` field. Read helper that
 * accepts either shape and returns split names, so old data doesn't break.
 */
export function readTravelerName(t: Traveler | { full_name?: string; first_name?: string; surname?: string }): {
  surname: string;
  first_name: string;
} {
  const surname = ("surname" in t ? t.surname : "") ?? "";
  const first_name = ("first_name" in t ? t.first_name : "") ?? "";
  if (surname || first_name) return { surname, first_name };
  const legacy = ("full_name" in t ? t.full_name : "") ?? "";
  if (!legacy) return { surname: "", first_name: "" };
  const parts = legacy.trim().split(/\s+/);
  if (parts.length === 1) return { surname: parts[0], first_name: "" };
  return { surname: parts[parts.length - 1], first_name: parts.slice(0, -1).join(" ") };
}

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
