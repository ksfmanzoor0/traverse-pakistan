import { redirect } from "next/navigation";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import { BookingDetail } from "@/components/bookings/BookingDetail";

interface Props {
  params: Promise<{ ref: string }>;
}

type BookingTable = "package_bookings" | "hotel_bookings" | "bookings";
type BookingKind = "package" | "hotel" | "tour";

function classify(ref: string): { table: BookingTable; kind: BookingKind } {
  if (ref.startsWith("PKG-")) return { table: "package_bookings", kind: "package" };
  if (ref.startsWith("HTL-")) return { table: "hotel_bookings", kind: "hotel" };
  return { table: "bookings", kind: "tour" };
}

export default async function BookingPage({ params }: Props) {
  const { ref } = await params;
  const { table, kind } = classify(ref);

  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user ?? null;

  const findNext = `/bookings/find?next=${encodeURIComponent(`/bookings/${ref}`)}`;

  if (!user) {
    redirect(findNext);
  }

  const verified = user.user_metadata?.verified_via_otp === true;
  if (!verified) {
    redirect(findNext);
  }

  // Use service role to read booking (RLS off in PR-1; PR-2 will switch to anon + policy).
  const admin = getSupabaseAdmin();
  const { data: booking, error } = await admin
    .from(table)
    .select("*")
    .eq("booking_ref", ref)
    .maybeSingle();

  if (error || !booking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-[18px] font-bold text-[var(--text-primary)]">Booking not found</p>
          <p className="text-[14px] text-[var(--text-secondary)]">This booking reference does not exist.</p>
        </div>
      </div>
    );
  }

  // Ownership check — booking.user_id must match the current session user.
  if (booking.user_id && booking.user_id !== user.id) {
    redirect(findNext);
  }

  return (
    <BookingDetail
      bookingRef={ref}
      data={{ type: kind, booking: booking as Record<string, unknown> }}
    />
  );
}
