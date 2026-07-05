"use client";

import { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { createHotelBooking } from "@/services/booking.service";
import { trackAddToCart } from "@/lib/analytics/track";
import { Icon } from "@/components/ui/Icon";
import { InlineAlert } from "@/components/ui/InlineAlert";
import type { Hotel, HotelRoom, HotelSeasonDefinition } from "@/types/hotel";

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function diffDays(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

// Season-aware pricing — mirrors the sidebar so the charged total matches what was shown.
function getSeasonLabel(date: Date, seasons: HotelSeasonDefinition[]): string | null {
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const mmdd = `${mm}-${dd}`;
  for (const season of seasons) {
    for (const period of season.periods) {
      if (period.from > period.to) {
        if (mmdd >= period.from || mmdd <= period.to) return season.label;
      } else {
        if (mmdd >= period.from && mmdd <= period.to) return season.label;
      }
    }
  }
  return null;
}

function getRoomPrice(room: HotelRoom, seasonLabel: string | null): number {
  if (room.prices && seasonLabel) {
    const match = room.prices.find((p) => p.season === seasonLabel);
    if (match) return match.price;
  }
  return room.price;
}

// Single-occupancy rate for the active season: seasonal single → flat single → none.
function getSingleRate(room: HotelRoom, seasonLabel: string | null): number | null {
  if (room.prices && seasonLabel) {
    const match = room.prices.find((p) => p.season === seasonLabel);
    if (match?.singlePrice != null) return match.singlePrice;
  }
  return room.singlePrice ?? null;
}

interface LineItem {
  roomName: string;
  qty: number;
  adults: number;
  children: number;
  pricePerNight: number;
  isSingle: boolean;
  singleSaving: number;   // per-stay saving vs the double rate (informational)
}

/** Parses repeated ?r=roomName|qty|adults|children params */
function parseLineItems(searchParams: URLSearchParams, hotel: Hotel, nights: number, seasonLabel: string | null): LineItem[] {
  return searchParams.getAll("r").flatMap((raw) => {
    const parts = raw.split("|");
    if (parts.length < 4) return [];
    const [roomName, qtyStr, adultsStr, childrenStr] = parts;
    const room = hotel.rooms.find((r) => r.name === roomName);
    if (!room) return [];
    const qty = Math.max(1, Number(qtyStr));
    const adults = Math.max(0, Number(adultsStr));
    const children = Math.max(0, Number(childrenStr));
    const basePrice = getRoomPrice(room, seasonLabel);
    const singleRate = getSingleRate(room, seasonLabel);
    // Single occupancy = exactly 1 adult per room, no children, and the room offers a single rate.
    const isSingle = adults === qty && children === 0 && singleRate != null;
    const pricePerNight = isSingle ? singleRate! : basePrice;
    const singleSaving = isSingle ? (basePrice - singleRate!) * qty * nights : 0;
    return [{ roomName, qty, adults, children, pricePerNight, isSingle, singleSaving }];
  });
}

export function HotelCheckoutClient({ hotel }: { hotel: Hotel }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const checkin  = searchParams.get("checkin") ?? "";
  const checkout = searchParams.get("checkout") ?? "";
  const infant   = searchParams.get("infant") === "1";
  const nights   = checkin && checkout ? diffDays(checkin, checkout) : 1;

  // Season is keyed off check-in, matching the sidebar — keeps the charged total in sync with what was shown.
  const seasonLabel = checkin && hotel.seasons ? getSeasonLabel(new Date(checkin), hotel.seasons) : null;
  const lineItems = parseLineItems(searchParams, hotel, nights, seasonLabel);
  const totalAdults   = lineItems.reduce((s, li) => s + li.adults, 0);
  const totalChildren = lineItems.reduce((s, li) => s + li.children, 0);
  const totalRooms    = lineItems.reduce((s, li) => s + li.qty, 0);

  const subtotal = lineItems.reduce((s, li) => {
    const extraPeople = Math.max(0, li.adults + li.children - 2 * li.qty);
    const room = hotel.rooms.find((r) => r.name === li.roomName);
    const extraRate = room?.extraOccupancyCharge ?? 0;
    return s + li.pricePerNight * li.qty * nights + extraRate * extraPeople * nights;
  }, 0);
  const gstRate = hotel.taxRate ?? 0;
  const bedRate = hotel.bedTaxRate ?? 0;
  const gstAmount = Math.round(subtotal * gstRate);
  const bedAmount = Math.round(subtotal * bedRate);
  const grandTotal = subtotal + gstAmount + bedAmount;
  const hasAnyTax = gstAmount > 0 || bedAmount > 0;

  const [form, setForm] = useState({
    firstName: "",
    email: "",
    phone: "",
    specialRequests: infant ? "Travelling with an infant — crib may be required" : "",
    arrivalTime: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stable per-attempt UUID — server dedups so retries can't create duplicates.
  const submitUuidRef = useRef<string>(crypto.randomUUID());

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const input = {
      hotelSlug: hotel.slug,
      lineItems,
      checkinDate: checkin || null,
      checkoutDate: checkout || null,
      adults: totalAdults,
      children: totalChildren,
      nights,
      totalAmount: grandTotal,
      contact: {
        name: form.firstName.trim(),
        email: form.email,
        phone: form.phone,
      },
      arrivalTime: form.arrivalTime || undefined,
      notes: form.specialRequests || undefined,
      submitUuid: submitUuidRef.current,
    };
    const isNetworkError = (e: unknown) => {
      const msg = e instanceof Error ? e.message.toLowerCase() : "";
      return msg.includes("load failed") || msg.includes("network") || msg.includes("fetch");
    };
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const result = await createHotelBooking(input);
        trackAddToCart({
          bookingRef: result.bookingRef,
          bookingType: "hotel",
          itemId: hotel.slug,
          itemName: hotel.name,
          totalAmount: result.totalAmount,
        });
        router.push(`/hotels/${hotel.slug}/checkout/success?ref=${result.bookingRef}&amount=${result.totalAmount}`);
        return;
      } catch (e) {
        lastErr = e;
        if (!isNetworkError(e) || attempt === 2) break;
        setError("Connection issue — retrying…");
        await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
      }
    }
    const msg = lastErr instanceof Error ? lastErr.message : "";
    setError(
      isNetworkError(lastErr)
        ? "We couldn't reach the server. Please check your connection and try again, or contact us on WhatsApp at +92 321 6650670."
        : msg || "Booking failed. Please try again."
    );
    setSubmitting(false);
  }

  const isValid = form.firstName && form.phone && lineItems.length > 0;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">

      {/* ── Left: Guest form ── */}
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Guest details */}
        <section>
          <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Guest details</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                Name <span className="text-[var(--error)]" aria-hidden="true">*</span>
              </label>
              <input name="firstName" type="text" required value={form.firstName} onChange={handleChange} placeholder="Ali Khan"
                className="w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                  Phone <span className="text-[var(--error)]" aria-hidden="true">*</span>
                </label>
                <input name="phone" type="tel" required value={form.phone} onChange={handleChange} placeholder="+92 300 0000000"
                  className="w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="ali@example.com"
                  className="w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors" />
              </div>
            </div>
          </div>
        </section>

        {/* Arrival */}
        <section>
          <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Arrival details</h2>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">Estimated arrival time</label>
            <select name="arrivalTime" value={form.arrivalTime} onChange={handleChange}
              className="w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors cursor-pointer">
              <option value="">Select time (optional)</option>
              <option>Before 12:00 PM</option>
              <option>12:00 PM – 2:00 PM</option>
              <option>2:00 PM – 4:00 PM</option>
              <option>4:00 PM – 6:00 PM</option>
              <option>6:00 PM – 8:00 PM</option>
              <option>After 8:00 PM</option>
            </select>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">Check-in is from {hotel.checkIn}. Early check-in subject to availability.</p>
          </div>
        </section>

        {/* Special requests */}
        <section>
          <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Special requests</h2>
          <textarea name="specialRequests" value={form.specialRequests} onChange={handleChange} rows={4}
            placeholder="Any dietary requirements, accessibility needs, room preferences, or other requests…"
            className="w-full px-4 py-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors resize-none" />
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">Special requests cannot be guaranteed — we&apos;ll do our best to accommodate them.</p>
        </section>

        {error && <InlineAlert>{error}</InlineAlert>}

        <div className="space-y-2">
          <button type="submit" disabled={!isValid || submitting}
            className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]">
            {submitting ? "Confirming booking…" : "Confirm booking"}
          </button>
        </div>
        <p className="text-center text-[12px] text-[var(--text-tertiary)] -mt-4">You won&apos;t be charged yet — pay securely on the next step.</p>

      </form>

      {/* ── Right: Booking summary ── */}
      <aside>
        <div className="sticky top-[100px] bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
          <div className="relative aspect-[16/9]">
            <Image src={hotel.image} alt={hotel.name} fill className="object-cover" sizes="380px" />
          </div>
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--primary)] mb-0.5">{hotel.propertyType}</p>
              <h3 className="text-[16px] font-bold text-[var(--text-primary)]">{hotel.name}</h3>
              <p className="text-[12px] text-[var(--text-tertiary)] mt-0.5">{hotel.location}</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1 flex items-center gap-1">
                <Icon name="star" size="xs" weight="fill" color="var(--primary-muted)" />
                {hotel.rating} · {hotel.reviewCount} reviews
              </p>
            </div>

            <div className="border-t border-[var(--border-default)]" />

            {/* Dates */}
            {checkin && checkout ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-0.5">Check-in</p>
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{fmt(checkin)}</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">From {hotel.checkIn}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-tertiary)] mb-0.5">Check-out</p>
                  <p className="text-[13px] font-semibold text-[var(--text-primary)]">{fmt(checkout)}</p>
                  <p className="text-[11px] text-[var(--text-tertiary)]">Until {hotel.checkOut}</p>
                </div>
              </div>
            ) : (
              <p className="text-[13px] text-[var(--text-tertiary)] italic">No dates selected</p>
            )}

            <div className="border-t border-[var(--border-default)]" />

            {/* Room line items */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wide text-[var(--text-tertiary)]">
                {totalRooms} room{totalRooms !== 1 ? "s" : ""} · {totalAdults} adult{totalAdults !== 1 ? "s" : ""}{totalChildren > 0 ? ` · ${totalChildren} child${totalChildren !== 1 ? "ren" : ""}` : ""}
              </p>
              {lineItems.map((li) => {
                const room = hotel.rooms.find((r) => r.name === li.roomName);
                const extraPeople = Math.max(0, li.adults + li.children - 2 * li.qty);
                const extraRate = room?.extraOccupancyCharge ?? 0;
                const lineTotal = li.pricePerNight * li.qty * nights + extraRate * extraPeople * nights;
                return (
                  <div key={li.roomName}>
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[var(--text-secondary)]">
                        {li.roomName} ×{li.qty}
                        <span className="text-[var(--text-tertiary)]"> · {li.adults}A{li.children > 0 ? ` ${li.children}C` : ""}</span>
                      </span>
                      <span className="font-semibold text-[var(--text-primary)] tabular-nums">{formatPrice(lineTotal)}</span>
                    </div>
                    {li.isSingle && li.singleSaving > 0 && (
                      <p className="text-[11px] text-[var(--success)] mt-0.5">
                        Single occupancy rate · save {formatPrice(li.singleSaving)}
                      </p>
                    )}
                    {extraPeople > 0 && extraRate > 0 && (
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                        +{extraPeople} extra guest{extraPeople > 1 ? "s" : ""} · {formatPrice(extraRate)}/night each
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="border-t border-[var(--border-default)]" />

            {/* Totals */}
            <div className="space-y-2">
              {hasAnyTax ? (
                <>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-[var(--text-secondary)]">Subtotal</span>
                    <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(subtotal)}</span>
                  </div>
                  {gstAmount > 0 && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[var(--text-secondary)]">GST ({Math.round(gstRate * 100)}%)</span>
                      <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(gstAmount)}</span>
                    </div>
                  )}
                  {bedAmount > 0 && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-[var(--text-secondary)]">Bed Tax ({Math.round(bedRate * 100)}%)</span>
                      <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(bedAmount)}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex justify-between text-[13px] text-[var(--success)]">
                  <span>Taxes & fees</span>
                  <span>Included</span>
                </div>
              )}
              <div className="flex justify-between text-[15px] font-bold">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
