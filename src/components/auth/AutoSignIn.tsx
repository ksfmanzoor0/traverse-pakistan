"use client";

import { useAutoSignIn } from "@/lib/auth/useAutoSignIn";

// Renders nothing. Mount this on any page that should silently exchange a
// magic-link tokenHash for a Supabase session (delivered via API response
// or ?t= query param). Skips gracefully if no token, no need to guard.
export function AutoSignIn({ token }: { token?: string | null }) {
  useAutoSignIn(token ?? null);
  return null;
}
