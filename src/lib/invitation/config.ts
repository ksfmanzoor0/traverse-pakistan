export const INVITATION_LETTER_PRICE_PKR = Number(
  process.env.INVITATION_LETTER_PRICE_PKR ?? 14000
);
export const INVITATION_LETTER_PRICE_USD = 50;

export function generateInvitationRef(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${rand}`;
}
