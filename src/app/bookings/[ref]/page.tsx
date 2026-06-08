import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireBookingViewer } from "@/lib/auth/requireBookingViewer";
import { isSynthesizedEmail } from "@/lib/auth/phone";
import { BookingDetail } from "@/components/bookings/BookingDetail";

interface Props {
  params: Promise<{ ref: string }>;
}

const KIND_FROM_TABLE = {
  package_bookings: "package",
  hotel_bookings: "hotel",
  bookings: "tour",
} as const;

export default async function BookingPage({ params }: Props) {
  const { ref } = await params;

  const viewer = await requireBookingViewer(ref);

  if (!viewer.ok) {
    if (viewer.reason === "not-found") {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="text-center space-y-3">
            <p className="text-[18px] font-bold text-[var(--text-primary)]">Booking not found</p>
            <p className="text-[14px] text-[var(--text-secondary)]">This booking reference does not exist.</p>
          </div>
        </div>
      );
    }
    redirect(`/bookings/find?next=${encodeURIComponent(`/bookings/${ref}`)}`);
  }

  const admin = getSupabaseAdmin();
  const table = viewer.table;
  const { data: booking } = await (table === "package_bookings"
    ? admin.from("package_bookings").select("*").eq("booking_ref", ref).maybeSingle()
    : table === "hotel_bookings"
      ? admin.from("hotel_bookings").select("*").eq("booking_ref", ref).maybeSingle()
      : admin.from("bookings").select("*").eq("booking_ref", ref).maybeSingle());

  if (!booking) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-[18px] font-bold text-[var(--text-primary)]">Booking not found</p>
        </div>
      </div>
    );
  }

  // For phone-only bookers, the auth user has a synthesized @traverse.internal
  // email that can't receive mail. Detect this so ManageBanner can offer an
  // "use email instead" prompt — useful when WhatsApp delivery isn't working.
  let needsEmail = false;
  if (viewer.bookingUserId) {
    const { data: authUser } = await admin.auth.admin.getUserById(viewer.bookingUserId);
    needsEmail = isSynthesizedEmail(authUser?.user?.email ?? null);
  }

  return (
    <BookingDetail
      bookingRef={ref}
      data={{ type: KIND_FROM_TABLE[table], booking: booking as Record<string, unknown> }}
      canManage={viewer.canManage}
      needsEmail={needsEmail}
    />
  );
}
