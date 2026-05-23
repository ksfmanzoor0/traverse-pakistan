"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase/client";

// Consumes a one-time magic-link token returned by the server in a page render
// or API response. Skips verifyOtp if the user is already signed in (avoids
// burning the token and silently swapping identities). Strips the token from
// the URL on success so refresh/share doesn't try to re-verify.
//
// Pass tokenHash in via prop, OR omit and the hook will read `?t=` from URL.
export function useAutoSignIn(tokenHash?: string | null) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ranRef = useRef(false);

  useEffect(() => {
    if (ranRef.current) return;

    const fromUrl = searchParams?.get("t") ?? null;
    const hash = tokenHash ?? fromUrl;
    if (!hash) return;

    ranRef.current = true;

    (async () => {
      const supabase = getSupabaseBrowser();

      const { data: existing } = await supabase.auth.getUser();
      const stripTokenFromUrl = () => {
        if (!searchParams?.has("t")) return;
        const next = new URLSearchParams(searchParams.toString());
        next.delete("t");
        const qs = next.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      };

      if (existing?.user) {
        // Already in session — don't burn the token, just clean the URL.
        stripTokenFromUrl();
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: hash,
          type: "magiclink",
        });
        if (error) {
          console.warn("[useAutoSignIn] verifyOtp failed — falling back to find-booking on next action:", error.message);
        }
      } catch (err) {
        console.warn("[useAutoSignIn] exception:", err);
      } finally {
        stripTokenFromUrl();
        // Refresh so server components re-render with the new session.
        router.refresh();
      }
    })();
  }, [tokenHash, searchParams, pathname, router]);
}
