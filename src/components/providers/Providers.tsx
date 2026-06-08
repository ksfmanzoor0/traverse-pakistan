"use client";

import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { WishlistProvider } from "@/components/auth/WishlistProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WishlistProvider>{children}</WishlistProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
