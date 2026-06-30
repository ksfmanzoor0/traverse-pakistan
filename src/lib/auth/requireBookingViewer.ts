import { cookies } from "next/headers";
import { getSupabaseServer, getSupabaseAdmin } from "@/lib/supabase/server";
import { verifyViewCookie, viewCookieName } from "./viewCookie";

type BookingTable = "package_bookings" | "hotel_bookings" | "bookings";

function tableFromRef(ref: string): BookingTable {
  if (ref.startsWith("PKG-")) return "package_bookings";
  if (ref.startsWith("HTL-")) return "hotel_bookings";
  return "bookings";
}

export type ViewerKind = "session" | "cookie";

export interface RequireBookingViewerOk {
  ok: true;
  kind: ViewerKind;
  table: BookingTable;
  userId: string | null;
  bookingUserId: string | null;
  canManage: boolean; // true only when full Supabase session with verified_via_otp owns the booking
}

export interface RequireBookingViewerErr {
  ok: false;
  reason: "not-found" | "unauthorized";
}

// Lighter-weight than requireBookingOwner. Grants view+pay access when either:
//   (a) a signed-in user owns the booking (any session, including Channel 4), OR
//   (b) a per-booking view cookie matches the ref.
// `canManage` is true only when the session-owner also has verified_via_otp = true.
// Used by /bookings/[ref] page and any read-only endpoints.
export async function requireBookingViewer(ref: string): Promise<RequireBookingViewerOk | RequireBookingViewerErr> {
  const table = tableFromRef(ref);

  const admin = getSupabaseAdmin();
  const { data: booking, error } = await (table === "package_bookings"
    ? admin.from("package_bookings").select("user_id").eq("booking_ref", ref).maybeSingle()
    : table === "hotel_bookings"
      ? admin.from("hotel_bookings").select("user_id").eq("booking_ref", ref).maybeSingle()
      : admin.from("bookings").select("user_id").eq("booking_ref", ref).maybeSingle());

  if (error || !booking) return { ok: false, reason: "not-found" };
  const bookingUserId = (booking.user_id as string | null) ?? null;

  // Path 1: signed-in user owning the booking
  const supabase = await getSupabaseServer();
  const { data: sessionData } = await supabase.auth.getUser();
  const user = sessionData?.user ?? null;
  if (user && bookingUserId === user.id) {
    return {
      ok: true,
      kind: "session",
      table,
      userId: user.id,
      bookingUserId,
      canManage: user.user_metadata?.verified_via_otp === true,
    };
  }

  // Path 2: view cookie scoped to this booking
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(viewCookieName(ref))?.value;
  if (verifyViewCookie(cookieValue, ref)) {
    return {
      ok: true,
      kind: "cookie",
      table,
      userId: user?.id ?? null,
      bookingUserId,
      canManage: false,
    };
  }

  return { ok: false, reason: "unauthorized" };
}
