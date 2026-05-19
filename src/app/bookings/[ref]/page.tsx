"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { BookingVerifyGate } from "@/components/bookings/BookingVerifyGate";
import { BookingDetail } from "@/components/bookings/BookingDetail";

interface Props {
  params: Promise<{ ref: string }>;
}

export default function BookingPage({ params }: Props) {
  const { ref } = use(params);
  const [verified, setVerified] = useState(false);
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    if (sessionStorage.getItem(`booking-verified-${ref}`) === "1") {
      setVerified(true);
    }
  }, [ref]);

  // Fetch booking data once verified
  useEffect(() => {
    if (!verified) return;
    setLoading(true);
    fetch(`/api/bookings/${ref}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError("Failed to load booking."))
      .finally(() => setLoading(false));
  }, [verified, ref]);

  if (!verified) {
    return <BookingVerifyGate bookingRef={ref} onVerified={() => setVerified(true)} />;
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-[var(--text-secondary)] text-[15px]">Loading booking…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-[18px] font-bold text-[var(--text-primary)]">Booking not found</p>
          <p className="text-[14px] text-[var(--text-secondary)]">{error ?? "This booking ref doesn't exist."}</p>
        </div>
      </div>
    );
  }

  return (
    <BookingDetail
      bookingRef={ref}
      data={data as { type: "tour" | "package" | "hotel"; booking: Record<string, unknown> }}
    />
  );
}
