// Alfa's APG refuses to accept the same TransactionReferenceNumber twice —
// a failed or abandoned first attempt burns the ref and any retry returns
// "Invalid Request" from the handshake. To let customers retry a failed
// payment, initiate routes suffix the booking_ref with the incremented
// attempt count ("TP-DC3AFE-2", "-3", ...) before sending to Alfa; the
// receiver (IPN + status polling) strips the suffix so markBooking still
// gets the parent booking_ref.

// Strips a trailing "-<digits>" attempt suffix if present.
// Idempotent on already-parent refs.
//   "TP-DC3AFE"       -> "TP-DC3AFE"
//   "TP-DC3AFE-2"     -> "TP-DC3AFE"
//   "PKG-ABC12345-11" -> "PKG-ABC12345"
export function stripAttemptSuffix(ref: string): string {
  return ref.replace(/-\d+$/, "");
}

// Composes an Alfa-facing ref from a parent booking ref + a 1-based attempt.
// The first attempt for a booking is number 1 (no risk of colliding with the
// parent since we always append the count).
export function withAttemptSuffix(bookingRef: string, attemptNumber: number): string {
  const parent = stripAttemptSuffix(bookingRef);
  return `${parent}-${attemptNumber}`;
}
