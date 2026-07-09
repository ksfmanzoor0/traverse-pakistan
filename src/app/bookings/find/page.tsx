import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getBookingsForUser } from "@/lib/auth/getUserBookings";
import { FindBookingForm } from "@/components/bookings/FindBookingForm";

interface Props {
  searchParams: Promise<{ ref?: string; error?: string }>;
}

// /bookings/find
// - Unauthenticated: render the form (find by ref + contact match).
// - Verified user: skip the form — route them to their booking(s):
//     0 bookings → keep form (rare edge case)
//     1 booking → redirect to that booking
//     2+        → redirect to /mybookings list
export default async function FindBookingPage({ searchParams }: Props) {
  await searchParams;

  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user;

  if (user && user.user_metadata?.verified_via_otp === true) {
    const bookings = await getBookingsForUser(user.id);
    if (bookings.length === 1) {
      const ref = bookings[0].ref;
      const href = ref.startsWith("INV-") ? `/invitation-letter/${ref}` : `/bookings/${ref}`;
      redirect(href);
    }
    if (bookings.length > 1) redirect("/mybookings");
    // 0 bookings → fall through to form (edge case)
  }

  return <FindBookingForm />;
}
