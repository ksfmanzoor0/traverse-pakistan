"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSupabaseBrowser } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

// Supabase stores the session in cookies prefixed with `sb-`. If the visitor
// has no such cookie, they're guaranteed to be anonymous — we can skip the
// network `getSession()` entirely instead of waiting on it.
function hasSupabaseAuthCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .some((c) => c.trim().startsWith("sb-"));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowser();

    // Anonymous visitor fast path — no cookie means no existing session, so
    // skip the getSession network call. We STILL subscribe to auth changes
    // below so a later client-side sign-in (e.g. OTP verifyOtp without a full
    // page navigation) updates the navbar live.
    if (!hasSupabaseAuthCookie()) {
      setLoading(false);
    } else {
      supabase.auth.getSession().then(({ data }) => {
        setSession(data.session);
        setLoading(false);
      });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    return {
      user: session?.user ?? null,
      session,
      loading,
      signOut: async () => {
        if (!isSupabaseConfigured) return;
        await getSupabaseBrowser().auth.signOut();
      },
    };
  }, [session, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
