// E.164 normalization for Pakistan + generic fallback.
// Booking forms accept "+923216650670", "03216650670", "+92 321 665 0670", etc.
// auth.users.phone must be E.164 without spaces or punctuation.

export function normalizePhone(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";

  // Strip everything except digits and leading +
  const digits = trimmed.replace(/[^\d+]/g, "");

  if (digits.startsWith("+")) {
    return digits;
  }

  // Pakistani local format: 03XX... → +923XX...
  if (digits.startsWith("03") && digits.length >= 11) {
    return "+92" + digits.slice(1);
  }

  // 92XX... without + → +92XX...
  if (digits.startsWith("92")) {
    return "+" + digits;
  }

  // Fallback: assume already country-prefixed, prepend +
  return "+" + digits;
}

// For synthesized email: only the digits, no +
export function phoneDigitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function synthesizeEmailFromPhone(phone: string): string {
  return `wa-${phoneDigitsOnly(phone)}@traverse.internal`;
}

export function isSynthesizedEmail(email: string | null | undefined): boolean {
  return !!email && email.endsWith("@traverse.internal");
}
