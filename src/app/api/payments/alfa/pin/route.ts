// Alias route: /api/payments/alfa/pin
// -------------------------------------------------------------------
// The prod Alfa merchant portal was configured with a Listener URL of
// `/pin` (typo of `/ipn`, transposed i and p). By the time we caught
// it, Alfa had already whitelisted /pin at their end and told us it's
// final. Rather than pushing to reverse the whitelisting, we expose
// the same handler under both paths so IPN callbacks land regardless
// of which URL Alfa dispatches to. /ipn remains the canonical spelling
// (matches the docs); /pin is a compatibility alias.

export { POST } from "../ipn/route";
