export type BookingStatus =
  | "pending"
  | "active"
  | "cancelled"
  | "rescheduled"
  | "postponed"
  | "completed";

export type RefundStatus =
  | "in_progress"
  | "processed"
  | "failed";

export const BOOKING_STATUSES: BookingStatus[] = [
  "pending", "active", "cancelled", "rescheduled", "postponed", "completed",
];

export const REFUND_STATUSES: RefundStatus[] = [
  "in_progress", "processed", "failed",
];

export function isBookingStatus(v: unknown): v is BookingStatus {
  return typeof v === "string" && (BOOKING_STATUSES as string[]).includes(v);
}

export function isRefundStatus(v: unknown): v is RefundStatus {
  return typeof v === "string" && (REFUND_STATUSES as string[]).includes(v);
}
