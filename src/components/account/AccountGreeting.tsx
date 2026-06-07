"use client";

import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";

export function AccountGreeting() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="mt-6 mb-10 h-[60px]" aria-hidden />
    );
  }

  if (!user) {
    return (
      <div className="mt-6 mb-10 p-6 bg-[var(--bg-subtle)] border border-[var(--border-default)] rounded-[var(--radius-md)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-bold text-[var(--text-primary)]">Welcome</h1>
          <p className="text-[var(--text-tertiary)] mt-1 text-[14px]">
            Sign in to manage your bookings and wishlist.
          </p>
        </div>
        <Link href="/auth/sign-in?redirect=/account">
          <Button size="lg">Sign in</Button>
        </Link>
      </div>
    );
  }

  const name = ((user.user_metadata?.name ?? user.user_metadata?.full_name) as string | undefined) ?? user.email ?? "there";
  return (
    <div className="mt-6 mb-10">
      <h1 className="text-[32px] font-bold text-[var(--text-primary)]">Hi, {name.split("@")[0]}</h1>
      <p className="text-[var(--text-tertiary)] mt-2">
        Manage your bookings, wishlist, and preferences.
      </p>
    </div>
  );
}
