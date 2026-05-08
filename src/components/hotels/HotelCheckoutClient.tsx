"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { createHotelBooking } from "@/services/booking.service";
import { Icon } from "@/components/ui/Icon";
import type { Hotel } from "@/types/hotel";

function fmt(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function diffDays(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function HotelCheckoutClient({ hotel }: { hotel: Hotel }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const checkin  = searchParams.get("checkin") ?? "";
  const checkout = searchParams.get("checkout") ?? "";
  const guests   = Number(searchParams.get("guests") ?? 2);
  const rooms    = Number(searchParams.get("rooms") ?? 1);
  const roomName = searchParams.get("room") ?? hotel.rooms[0]?.name ?? "";
  const adults      = Number(searchParams.get("adults") ?? guests);
  const children    = Number(searchParams.get("children") ?? 0);
  const extraPeople = Number(searchParams.get("extraPeople") ?? 0);
  const extraRate   = Number(searchParams.get("extraRate") ?? 0);
  const infant      = searchParams.get("infant") === "1";

  const selectedRoom = hotel.rooms.find((r) => r.name === roomName) ?? hotel.rooms[0];
  const nights = checkin && checkout ? diffDays(checkin, checkout) : 1;
  const subtotal = selectedRoom.price * rooms * nights + extraRate * extraPeople * nights;

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    specialRequests: infant ? "Travelling with an infant — crib may be required" : "",
    arrivalTime: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const result = await createHotelBooking({
        hotelSlug: hotel.slug,
        roomName: selectedRoom.name,
        checkinDate: checkin || null,
        checkoutDate: checkout || null,
        adults,
        children,
        rooms,
        nights,
        totalAmount: subtotal,
        contact: {
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          phone: form.phone,
        },
        arrivalTime: form.arrivalTime || undefined,
        notes: form.specialRequests || undefined,
      });
      router.push(
        `/hotels/${hotel.slug}/checkout/success?ref=${result.bookingRef}&amount=${result.totalAmount}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed. Please try again.");
      setSubmitting(false);
    }
  }

  const isValid = form.firstName && form.phone;

  return (
    <div className="lg:grid lg:grid-cols-[1fr_380px] lg:gap-10">

      {/* ── Left: Guest form ── */}
      <form onSubmit={handleSubmit} className="space-y-8">

        {/* Guest details */}
        <section>
          <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Guest details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                First name <span className="text-[var(--error)]" aria-hidden="true">*</span>
              </label>
              <input
                name="firstName" type="text" required value={form.firstName} onChange={handleChange}
                placeholder="Ali"
                className="w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                Last name
              </label>
              <input
                name="lastName" type="text" value={form.lastName} onChange={handleChange}
                placeholder="Khan"
                className="w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <input
                name="email" type="email" value={form.email} onChange={handleChange}
                placeholder="ali@example.com"
                className="w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
                Phone <span className="text-[var(--error)]" aria-hidden="true">*</span>
              </label>
              <input
                name="phone" type="tel" required value={form.phone} onChange={handleChange}
                placeholder="+92 300 0000000"
                className="w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors"
              />
            </div>
          </div>
        </section>

        {/* Arrival */}
        <section>
          <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Arrival details</h2>
          <div>
            <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5 uppercase tracking-wide">
              Estimated arrival time
            </label>
            <select
              name="arrivalTime" value={form.arrivalTime} onChange={handleChange}
              className="w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors cursor-pointer"
            >
              <option value="">Select time (optional)</option>
              <option>Before 12:00 PM</option>
              <option>12:00 PM – 2:00 PM</option>
              <option>2:00 PM – 4:00 PM</option>
              <option>4:00 PM – 6:00 PM</option>
              <option>6:00 PM – 8:00 PM</option>
              <option>After 8:00 PM</option>
            </select>
            <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
              Check-in is from {hotel.checkIn}. Early check-in subject to availability.
            </p>
          </div>
        </section>

        {/* Special requests */}
        <section>
          <h2 className="text-[18px] font-bold text-[var(--text-primary)] mb-4">Special requests</h2>
          <textarea
            name="specialRequests" value={form.specialRequests} onChange={handleChange}
            rows={4}
            placeholder="Any dietary requirements, accessibility needs, room preferences, or other requests…"
            className="w-full px-4 py-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors resize-none"
          />
          <p className="text-[11px] text-[var(--text-tertiary)] mt-1.5">
            Special requests cannot be guaranteed — we&apos;ll do our best to accommodate them.
          </p>
        </section>

        {/* Cancellation notice */}
        <section className="p-4 bg-[var(--primary-light)] border border-[var(--primary)]/20 rounded-[var(--radius-md)]">
          <div className="flex items-start gap-3">
            <Icon name="lock" size="sm" color="var(--success)" className="mt-0.5 shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-[var(--primary-deep)] mb-1">Free cancellation</p>
              <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                {hotel.policies.cancellation[0] ?? "Cancel anytime before check-in for a full refund."}
              </p>
            </div>
          </div>
        </section>

        {/* Error banner */}
        {error && (
          <div className="p-3 bg-[var(--error)]/10 border border-[var(--error)]/30 rounded-[var(--radius-sm)] text-[13px] text-[var(--error)]">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="space-y-2">
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full h-[52px] bg-[var(--primary)] text-[var(--text-inverse)] text-[15px] font-bold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {submitting ? "Confirming booking…" : "Confirm booking"}
          </button>
        </div>
        <p className="text-center text-[12px] text-[var(--text-tertiary)] -mt-4">
          You won&apos;t be charged yet — pay securely on the next step.
        </p>
      </form>

      {/* ── Right: Booking summary ── */}
      <aside>
        <div className="sticky top-[100px] bg-[var(--bg-primary)] border border-[var(--border-default)] rounded-[var(--radius-md)] overflow-hidden" style={{ boxShadow: "var(--shadow-md)" }}>
          {/* Hotel image */}
          <div className="relative aspect-[16/9]">
            <Image src={hotel.image} alt={hotel.name} fill className="object-cover" sizes="380px" />
          </div>

          <div className="p-5 space-y-4">
            {/* Hotel name */}
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

            {/* Room & guests */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">Room</span>
                <span className="font-semibold text-[var(--text-primary)]">{selectedRoom.name}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">Rooms</span>
                <span className="font-semibold text-[var(--text-primary)]">{rooms}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">Guests</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {adults} adult{adults !== 1 ? "s" : ""}{children > 0 ? `, ${children} child${children !== 1 ? "ren" : ""}` : ""}
                </span>
              </div>
            </div>

            <div className="border-t border-[var(--border-default)]" />

            {/* Price breakdown */}
            <div className="space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-[var(--text-secondary)]">
                  {formatPrice(selectedRoom.price)} × {rooms} room{rooms > 1 ? "s" : ""} × {nights} night{nights !== 1 ? "s" : ""}
                </span>
                <span className="text-[var(--text-primary)] font-medium tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-[13px] text-[var(--success)]">
                <span>Taxes & fees</span>
                <span>Included</span>
              </div>
              <div className="flex justify-between text-[15px] font-bold pt-2 border-t border-[var(--border-default)]">
                <span className="text-[var(--text-primary)]">Total</span>
                <span className="text-[var(--text-primary)] tabular-nums">{formatPrice(subtotal)}</span>
              </div>
            </div>

          </div>
        </div>
      </aside>
    </div>
  );
}
