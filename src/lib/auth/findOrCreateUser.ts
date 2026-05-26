import { getSupabaseAdmin } from "@/lib/supabase/server";
import { normalizePhone, synthesizeEmailFromPhone } from "./phone";

export interface SilentSignupInput {
  name: string;
  email?: string | null;
  phone: string;
}

export interface SilentSignupResult {
  userId: string;
  isNew: boolean;
  authEmail: string;
  phone: string;
}

// Find-or-create an auth.users row for a booking contact.
// - If email is provided and a user with that email exists → return that user
// - Else if phone matches an existing user → return that user
// - Else admin-create with email_confirm: true and verified_via_otp: false metadata
export async function findOrCreateUserForBooking(input: SilentSignupInput): Promise<SilentSignupResult> {
  const admin = getSupabaseAdmin();

  const phone = normalizePhone(input.phone);
  if (!phone) throw new Error("Phone is required for silent signup");

  const realEmail = input.email?.trim() || null;
  const lookupEmail = realEmail && realEmail.length > 0 ? realEmail : null;

  const { data: foundId, error: findError } = await admin.rpc("find_auth_user_by_contact", {
    p_email: lookupEmail,
    p_phone: phone,
  });
  if (findError) throw findError;

  if (foundId) {
    const { data: existing, error: getErr } = await admin.auth.admin.getUserById(foundId);
    if (getErr) throw getErr;
    return {
      userId: existing.user.id,
      isNew: false,
      authEmail: existing.user.email ?? synthesizeEmailFromPhone(phone),
      phone,
    };
  }

  const authEmail = lookupEmail ?? synthesizeEmailFromPhone(phone);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: authEmail,
    phone,
    email_confirm: true,
    phone_confirm: true,
    user_metadata: {
      name: input.name,
      verified_via_otp: false,
      origin: "silent_checkout",
    },
  });
  if (createErr) throw createErr;
  if (!created.user) throw new Error("Failed to create auth user");

  return {
    userId: created.user.id,
    isNew: true,
    authEmail,
    phone,
  };
}
