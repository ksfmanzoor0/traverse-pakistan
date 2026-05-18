"use client";

import { useState, useEffect } from "react";
import { formatPrice } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { DEFAULT_ROOM_CAPACITY, applyHotelMargin } from "@/lib/constants";
import { RoomImageCarousel } from "@/components/hotels/RoomImageCarousel";
import { HotelMobileBookingBar } from "@/components/hotels/HotelMobileBookingBar";
import { useHotelRoom } from "@/components/hotels/HotelRoomContext";
import type { Hotel, HotelRoom, HotelSeasonDefinition } from "@/types/hotel";

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

function getSeasonalPrice(room: HotelRoom, seasonLabel: string | null): number {
  if (room.prices && seasonLabel) {
    const match = room.prices.find((p) => p.season === seasonLabel);
    if (match) return match.price;
  }
  return room.price;
}

function maxOccupancyPerRoom(room: HotelRoom): number {
  const cap = room.capacity ?? DEFAULT_ROOM_CAPACITY;
  return cap.maxOccupancy ?? (cap.adults + cap.children);
}

function QtyBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="w-7 h-7 rounded-full border border-[var(--border-default)] flex items-center justify-center text-[var(--text-primary)] hover:border-[var(--primary)] hover:text-[var(--primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
        <line x1="2" y1="5" x2="8" y2="5"/>
        {label === "increase" && <line x1="5" y1="2" x2="5" y2="8"/>}
      </svg>
    </button>
  );
}

interface RoomCardProps {
  room: HotelRoom;
  roomIndex: number;
  roomImagesMap: Record<number, string[]>;
  seasons: HotelSeasonDefinition[];
}

function RoomCard({ room, roomIndex, roomImagesMap, seasons }: RoomCardProps) {
  const { selections, setQty, setAdults, setChildren, setInfant, checkIn } = useHotelRoom();
  const [expanded, setExpanded] = useState(false);

  const seasonLabel = checkIn && seasons.length > 0 ? getSeasonLabel(checkIn, seasons) : null;
  const displayPrice = getSeasonalPrice(room, seasonLabel);
  const sel = selections.get(room.name);
  const qty = sel?.qty ?? 0;
  const adults = sel?.adults ?? 2;
  const children = sel?.children ?? 0;
  const infant = sel?.infant ?? false;

  const maxOcc = maxOccupancyPerRoom(room);
  const maxQty = Math.min(10, room.available);
  const totalGuests = adults + children;
  const maxGuests = maxOcc * qty;
  const isOpen = expanded || qty > 0;

  // Sync expanded with qty — expand on add, collapse when removed from any path
  useEffect(() => {
    if (qty > 0) setExpanded(true);
    else setExpanded(false);
  }, [qty]);

  const r2imgs = roomImagesMap[roomIndex] ?? [];

  return (
    <div
      className={`rounded-[var(--radius-md)] border border-[var(--border-default)] transition-all duration-[var(--duration-normal)] flex flex-col ${
        qty > 0 ? "ring-2 ring-[var(--primary)]" : ""
      }`}
    >
      <div
        className={`overflow-hidden rounded-t-[var(--radius-md)] ${!isOpen ? "cursor-pointer" : ""}`}
        onClick={() => { if (!isOpen) setExpanded(true); }}
      >
        <RoomImageCarousel
          images={r2imgs}
          fallback={room.image}
          alt={room.name}
          available={room.available}
        />
      </div>

      {/* Info area — clickable to expand when not yet open */}
      <div
        className={`p-4 flex-1 flex flex-col ${!isOpen ? "cursor-pointer" : ""}`}
        onClick={() => { if (!isOpen) setExpanded(true); }}
      >
        <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{room.name}</h3>
        <p className="text-[17px] font-bold text-[var(--text-primary)] mt-1 tabular-nums">
          {formatPrice(displayPrice)}
          <span className="text-[12px] font-normal text-[var(--text-tertiary)]"> /night</span>
        </p>
        <div className="mt-2 space-y-0.5">
          {room.beds.split(" · ").map((detail, i) => (
            <p key={i} className="text-[13px] text-[var(--text-tertiary)]">{detail}</p>
          ))}
        </div>
        {room.capacity && (
          <div className="flex items-center gap-1 mt-2">
            <Icon name="users" size="xs" color="var(--text-tertiary)" />
            <span className="text-[12px] text-[var(--text-tertiary)]">
              Max {maxOcc} guest{maxOcc !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Add room — mt-auto pins it to bottom of flex info area */}
        {!isOpen && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setQty(room, 1); }}
            className="mt-auto pt-3 border-t border-[var(--border-default)] w-full flex items-center justify-between cursor-pointer group"
          >
            <span className="text-[12px] font-semibold text-[var(--primary)] group-hover:underline">Add room</span>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6l4 4 4-4"/>
            </svg>
          </button>
        )}
      </div>

      {/* Animated stepper — CSS grid trick for smooth height */}
      <div
        style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr" }}
        className="transition-[grid-template-rows] duration-[var(--duration-normal)] ease-[var(--ease-default)]"
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4">
            {/* Qty stepper */}
            <div className="flex items-center justify-between pt-3 border-t border-[var(--border-default)]">
              <span className="text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-[0.07em]">Rooms</span>
              <div className="flex items-center gap-3">
                <QtyBtn onClick={() => { setQty(room, qty - 1); if (qty - 1 === 0) setExpanded(false); }} disabled={qty <= 0} label="decrease" />
                <span className="w-4 text-center text-[14px] font-bold tabular-nums text-[var(--text-primary)]">{qty}</span>
                <QtyBtn onClick={() => setQty(room, qty + 1)} disabled={qty >= maxQty} label="increase" />
              </div>
            </div>

            {/* Guest pickers */}
            {qty > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border-default)] space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-[var(--text-secondary)]">Adults</p>
                  <div className="flex items-center gap-3">
                    <QtyBtn onClick={() => setAdults(room.name, Math.max(1, adults - 1))} disabled={adults <= 1} label="decrease" />
                    <span className="w-4 text-center text-[14px] font-bold tabular-nums text-[var(--text-primary)]">{adults}</span>
                    <QtyBtn onClick={() => setAdults(room.name, adults + 1)} disabled={totalGuests >= maxGuests} label="increase" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[12px] font-semibold text-[var(--text-secondary)]">Children</p>
                  <div className="flex items-center gap-3">
                    <QtyBtn onClick={() => setChildren(room.name, Math.max(0, children - 1))} disabled={children <= 0} label="decrease" />
                    <span className="w-4 text-center text-[14px] font-bold tabular-nums text-[var(--text-primary)]">{children}</span>
                    <QtyBtn onClick={() => setChildren(room.name, children + 1)} disabled={totalGuests >= maxGuests} label="increase" />
                  </div>
                </div>
                {totalGuests >= maxGuests && (
                  <p className="text-[11px] text-[var(--primary)] font-medium">
                    Add more rooms to add more guests
                  </p>
                )}
                <label className="flex items-center gap-2 pt-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={infant}
                    onChange={(e) => setInfant(room.name, e.target.checked)}
                    className="w-3.5 h-3.5 rounded accent-[var(--primary)] cursor-pointer"
                  />
                  <span className="text-[12px] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                    Travelling with an infant
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface Props {
  hotel: Hotel;
  roomImagesMap: Record<number, string[]>;
}

export function HotelRoomsBookingClient({ hotel, roomImagesMap }: Props) {
  return (
    <>
      <div className="py-8 border-b border-[var(--border-default)]" id="rooms">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Where you&apos;ll sleep</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotel.rooms.map((room, i) => (
            <RoomCard key={room.name} room={room} roomIndex={i} roomImagesMap={roomImagesMap} seasons={hotel.seasons ?? []} />
          ))}
        </div>
      </div>

      <HotelMobileBookingBar hotel={hotel} />
    </>
  );
}
