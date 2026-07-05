"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getMyBookings } from "@/services/booking.service";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { Booking } from "@/types/booking";

type LoadState = "loading" | "empty" | "unconfigured" | "loaded" | "error" | "signed-out";

const statusColor: Record<Booking["status"], string> = {
  pending: "var(--warning)",
  deposit_paid: "var(--accent-warm)",
  confirmed: "var(--success)",
  cancelled: "var(--text-tertiary)",
  refunded: "var(--text-tertiary)",
};

export function TripsList() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setState("unconfigured");
      return;
    }
    if (authLoading) return;
    if (!user) {
      setState("signed-out");
      return;
    }
    getMyBookings()
      .then((list) => {
        setBookings(list);
        setState(list.length ? "loaded" : "empty");
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : "Failed to load trips");
        setState("error");
      });
  }, [user, authLoading]);

  if (state === "loading") {
    return <div className="text-center py-16 text-[var(--text-tertiary)]">Loading your trips…</div>;
  }

  if (state === "signed-out") {
    return (
      <EmptyState
        icon="lock"
        title="Sign in to view your trips"
        description="Sign in with email or Google to see bookings and manage trips."
        action={
          <Link href="/auth/sign-in?redirect=/mybookings">
            <Button size="lg">Sign in</Button>
          </Link>
        }
      />
    );
  }

  if (state === "unconfigured" || state === "empty") {
    return (
      <EmptyState
        icon="backpack"
        title="No trips yet"
        description="Once you book a tour, your trips will show up here."
        action={
          <Link href="/grouptours">
            <Button size="lg">Browse Tours</Button>
          </Link>
        }
      />
    );
  }

  if (state === "error") {
    return (
      <div className="text-center py-16 text-[var(--error)]">
        <p className="font-semibold">Couldn&apos;t load your trips</p>
        <p className="text-[13px] text-[var(--text-tertiary)] mt-1">{errorMsg}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4">
      {bookings.map((b) => (
        <div
          key={b.id}
          className="p-5 bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: statusColor[b.status] }}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                {b.status}
              </span>
              <span className="font-mono text-[12px] text-[var(--text-tertiary)] truncate">
                {b.bookingRef}
              </span>
            </div>
            <p className="mt-2 text-[15px] font-semibold text-[var(--text-primary)]">
              {b.seats} traveler{b.seats !== 1 ? "s" : ""}
            </p>
            <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
              Booked on {new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-[18px] font-bold text-[var(--text-primary)] tabular-nums">
              {formatPrice(b.totalAmount)}
            </p>
            <p className="text-[11px] text-[var(--text-tertiary)]">{b.currency}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
