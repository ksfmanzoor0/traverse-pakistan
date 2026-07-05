import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Move every booking + related record from `ghostUserId` to `targetUserId`,
// then delete the ghost auth.users row. Only usable server-side with the
// service-role admin client. FK is ON DELETE SET NULL on the three booking
// tables, so we reparent first and delete last — a partial failure leaves
// the ghost intact rather than orphaning rows.
export async function mergeUsers(
  admin: SupabaseClient<Database>,
  targetUserId: string,
  ghostUserId: string,
): Promise<void> {
  if (targetUserId === ghostUserId) return;

  const tables = ["bookings", "package_bookings", "hotel_bookings"] as const;
  for (const t of tables) {
    const { error } = await admin
      .from(t)
      .update({ user_id: targetUserId })
      .eq("user_id", ghostUserId);
    if (error) {
      console.error(`[mergeUsers] failed to reparent ${t}:`, error);
      throw error;
    }
  }

  const { error: delErr } = await admin.auth.admin.deleteUser(ghostUserId);
  if (delErr) {
    console.error("[mergeUsers] failed to delete ghost user:", delErr);
    throw delErr;
  }
  console.log(`[mergeUsers] merged ${ghostUserId} → ${targetUserId}`);
}

// After an OAuth sign-in we look for any silent-checkout ghost users whose
// bookings share the OAuth user's email. Matching a ghost by email in the
// booking's contact_email is a strong ownership signal — the customer used
// this email during checkout, then later signed in via Google with the same
// email. Merge them so the OAuth user sees their pre-existing bookings.
export async function linkGhostsToOAuthUser(
  admin: SupabaseClient<Database>,
  oauthUserId: string,
  oauthEmail: string,
): Promise<void> {
  const emailLower = oauthEmail.trim().toLowerCase();
  if (!emailLower) return;

  const seen = new Set<string>();
  const tables = ["bookings", "package_bookings", "hotel_bookings"] as const;
  for (const t of tables) {
    const { data, error } = await admin
      .from(t)
      .select("user_id")
      .ilike("contact_email", emailLower)
      .not("user_id", "is", null);
    if (error) {
      console.error(`[linkGhostsToOAuthUser] scan ${t} failed:`, error);
      continue;
    }
    for (const row of data ?? []) {
      const uid = (row as { user_id: string | null }).user_id;
      if (uid && uid !== oauthUserId) seen.add(uid);
    }
  }

  for (const ghost of seen) {
    try {
      await mergeUsers(admin, oauthUserId, ghost);
    } catch (err) {
      console.error(`[linkGhostsToOAuthUser] merge ${ghost} → ${oauthUserId} failed:`, err);
    }
  }
}
