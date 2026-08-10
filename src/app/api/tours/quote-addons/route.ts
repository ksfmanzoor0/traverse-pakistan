import { NextRequest, NextResponse } from "next/server";
import { quoteTourAddons, type HomeCity } from "@/services/addon-cost.service";

export const dynamic = "force-dynamic";

const VALID_HOMES: HomeCity[] = ["ISB", "LHE", "KHI"];

export async function GET(req: NextRequest) {
  const tourSlug = req.nextUrl.searchParams.get("tourSlug");
  const homeCity = req.nextUrl.searchParams.get("homeCity") as HomeCity | null;
  const startDate = req.nextUrl.searchParams.get("startDate");

  if (!tourSlug || !homeCity || !startDate) {
    return NextResponse.json({ error: "tourSlug, homeCity, startDate required" }, { status: 400 });
  }
  if (!VALID_HOMES.includes(homeCity)) {
    return NextResponse.json({ error: `homeCity must be one of ${VALID_HOMES.join(", ")}` }, { status: 400 });
  }

  try {
    const quote = await quoteTourAddons({ tourSlug, homeCity, startDate });
    if (!quote) return NextResponse.json({ error: "tour not found" }, { status: 404 });
    return NextResponse.json(quote);
  } catch (err) {
    console.error("[api/tours/quote-addons] failed:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
