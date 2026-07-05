import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { alfaConfig } from "@/lib/alfa/config";
import { markBooking } from "@/lib/payments/markBooking";
import { createViewCookie } from "@/lib/auth/viewCookie";
import { stripAttemptSuffix, withAttemptSuffix } from "@/lib/alfa/txnRef";

async function checkAlfaIPN(ref: string): Promise<{ status: "paid" | "failed" | "pending"; amount: number | null }> {
  try {
    const ipnUrl = `${alfaConfig.ipnBaseUrl}/${alfaConfig.merchantId}/${alfaConfig.storeId}/${ref}`;
    const res = await fetch(ipnUrl);
    const raw = await res.json();
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    const rawAmount = data.TransactionAmount ?? data.Amount;
    const amount = rawAmount != null && !Number.isNaN(Number(rawAmount)) ? Number(rawAmount) : null;
    if (data.TransactionStatus === "Paid") return { status: "paid", amount };
    if (data.ResponseCode === "00") return { status: "paid", amount };
    return { status: "pending", amount: null };
  } catch {
    return { status: "pending", amount: null };
  }
}

interface StatusResponse {
  bookingRef: string;
  status: "paid" | "failed" | "pending";
  amount: number;
}

function buildResponse(ref: string, amount: number, status: "paid" | "failed" | "pending"): NextResponse<StatusResponse> {
  const res = NextResponse.json({ bookingRef: ref, status, amount });
  // Grant view-tier access to whoever's polling once payment terminates
  // (paid or failed). They came through Alfa with this ref — trust them
  // enough to see + retry the booking. Manage still requires verified_via_otp.
  if (status === "paid" || status === "failed") {
    const cookie = createViewCookie(ref);
    res.cookies.set(cookie.name, cookie.value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: cookie.maxAge,
    });
  }
  return res;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawRef = searchParams.get("ref");

  if (!rawRef) {
    return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  }

  // Callers may hand us either the parent ref (customer opening the booking
  // page cold) or the per-attempt suffixed ref that Alfa echoed on redirect.
  // DB always keys on the parent ref; Alfa's OrderStatus keys on the exact
  // ref we sent them, which is the suffixed one.
  const parentRef = stripAttemptSuffix(rawRef);
  const suffixedFromCaller = rawRef !== parentRef ? rawRef : null;

  const supabase = getSupabaseAdmin();

  // Pick the ref Alfa knows about. If the caller passed a suffixed ref, use
  // it as-is. Otherwise construct "-<latest attempt>" from the booking row.
  async function alfaRefFor(latestAttempt: number): Promise<string> {
    if (suffixedFromCaller) return suffixedFromCaller;
    if (latestAttempt <= 0) return parentRef; // pre-attempt polling, Alfa won't find it either
    return withAttemptSuffix(parentRef, latestAttempt);
  }

  if (parentRef.startsWith("PKG-")) {
    const { data, error } = await supabase
      .from("package_bookings")
      .select("booking_ref, payment_status, total_amount, payment_attempts")
      .eq("booking_ref", parentRef)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    // Same reasoning as the bookings block below: deposit_paid is a positive
    // reconciled state; don't re-poll Alfa or markBooking will double the
    // amount_paid on the next tick.
    const raw = (data.payment_status ?? "pending") as string;
    let status: "paid" | "failed" | "pending" =
      raw === "paid" || raw === "deposit_paid" ? "paid" :
      raw === "failed" ? "failed" :
      "pending";
    if (status === "pending") {
      const alfaRef = await alfaRefFor(Number(data.payment_attempts ?? 0));
      const alfa = await checkAlfaIPN(alfaRef);
      if (alfa.status === "paid") {
        await markBooking(parentRef, true, alfa.amount, "polling", alfaRef);
        status = "paid";
      }
    }
    return buildResponse(parentRef, Number(data.total_amount), status);
  }

  if (parentRef.startsWith("HTL-")) {
    const { data, error } = await supabase
      .from("hotel_bookings")
      .select("booking_ref, payment_status, total_amount, payment_attempts")
      .eq("booking_ref", parentRef)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    let status = (data.payment_status ?? "pending") as "paid" | "failed" | "pending";
    if (status === "pending") {
      const alfaRef = await alfaRefFor(Number(data.payment_attempts ?? 0));
      const alfa = await checkAlfaIPN(alfaRef);
      if (alfa.status === "paid") {
        await markBooking(parentRef, true, alfa.amount, "polling", alfaRef);
        status = "paid";
      }
    }
    return buildResponse(parentRef, Number(data.total_amount), status);
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_ref, status, total_amount, payment_attempts")
    .eq("booking_ref", parentRef)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // deposit_paid is a terminal-for-polling state: the row already reconciled
  // a positive payment (deposit lands here). Treating it as "pending" would
  // re-invoke markBooking on the next poll and additively double-count
  // amount_paid, so we surface it as "paid" and skip the Alfa recheck.
  let normalized: "paid" | "failed" | "pending" =
    data.status === "confirmed" || data.status === "deposit_paid" ? "paid" :
    data.status === "cancelled" ? "failed" :
    "pending";

  if (normalized === "pending") {
    const alfaRef = await alfaRefFor(Number(data.payment_attempts ?? 0));
    const alfa = await checkAlfaIPN(alfaRef);
    if (alfa.status === "paid") {
      await markBooking(parentRef, true, alfa.amount, "polling", alfaRef);
      normalized = "paid";
    }
  }

  return buildResponse(parentRef, Number(data.total_amount), normalized);
}
