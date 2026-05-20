import { Resend } from "resend";

export const FROM = process.env.EMAIL_FROM ?? "Traverse Pakistan <bookings@traversepakistan.com>";

export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not set");
  return new Resend(key);
}
