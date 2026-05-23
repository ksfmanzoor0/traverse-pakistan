import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { alfaConfig } from "@/lib/alfa/config";
import { markBooking } from "@/lib/payments/markBooking";
import { mintLoginTokenForBooking } from "@/lib/auth/mintLoginToken";

async function checkAlfaIPN(ref: string): Promise<"paid" | "failed" | "pending"> {
  try {
    const ipnUrl = `${alfaConfig.ipnBaseUrl}/${alfaConfig.merchantId}/${alfaConfig.storeId}/${ref}`;
    const res = await fetch(ipnUrl);
    const raw = await res.json();
    const data = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (data.TransactionStatus === "Paid") return "paid";
    if (data.ResponseCode === "00") return "paid";
    return "pending";
  } catch {
    return "pending";
  }
}

interface StatusResponse {
  bookingRef: string;
  status: "paid" | "failed" | "pending";
  amount: number;
  tokenHash?: string | null;
}

async function buildResponse(ref: string, amount: number, status: "paid" | "failed" | "pending"): Promise<NextResponse<StatusResponse>> {
  const body: StatusResponse = { bookingRef: ref, status, amount };
  // Mint a fresh login token only when paid — return page uses it for auto-sign-in.
  if (status === "paid") {
    body.tokenHash = await mintLoginTokenForBooking(ref);
  }
  return NextResponse.json(body);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");

  if (!ref) {
    return NextResponse.json({ error: "Missing ref" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  if (ref.startsWith("PKG-")) {
    const { data, error } = await supabase
      .from("package_bookings")
      .select("booking_ref, payment_status, total_amount")
      .eq("booking_ref", ref)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    let status = (data.payment_status ?? "pending") as "paid" | "failed" | "pending";
    if (status === "pending") {
      const alfaStatus = await checkAlfaIPN(ref);
      if (alfaStatus === "paid") {
        await markBooking(ref, true);
        status = "paid";
      }
    }
    return buildResponse(ref, Number(data.total_amount), status);
  }

  if (ref.startsWith("HTL-")) {
    const { data, error } = await supabase
      .from("hotel_bookings")
      .select("booking_ref, payment_status, total_amount")
      .eq("booking_ref", ref)
      .maybeSingle();
    if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

    let status = (data.payment_status ?? "pending") as "paid" | "failed" | "pending";
    if (status === "pending") {
      const alfaStatus = await checkAlfaIPN(ref);
      if (alfaStatus === "paid") {
        await markBooking(ref, true);
        status = "paid";
      }
    }
    return buildResponse(ref, Number(data.total_amount), status);
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("booking_ref, status, total_amount")
    .eq("booking_ref", ref)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  let normalized: "paid" | "failed" | "pending" =
    data.status === "confirmed" ? "paid" :
    data.status === "cancelled" ? "failed" :
    "pending";

  if (normalized === "pending") {
    const alfaStatus = await checkAlfaIPN(ref);
    if (alfaStatus === "paid") {
      await markBooking(ref, true);
      normalized = "paid";
    }
  }

  return buildResponse(ref, Number(data.total_amount), normalized);
}
