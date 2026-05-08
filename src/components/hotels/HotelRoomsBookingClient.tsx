"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";
import { Icon } from "@/components/ui/Icon";
import { DEFAULT_ROOM_CAPACITY } from "@/lib/constants";
import { RoomImageCarousel } from "@/components/hotels/RoomImageCarousel";
import { HotelMobileBookingBar } from "@/components/hotels/HotelMobileBookingBar";
import type { Hotel, HotelRoom } from "@/types/hotel";

function maxOccupancyPerRoom(room: HotelRoom): number {
  const cap = room.capacity ?? DEFAULT_ROOM_CAPACITY;
  return cap.maxOccupancy ?? (cap.adults + cap.children);
}

interface Props {
  hotel: Hotel;
  roomImagesMap: Record<number, string[]>;
}

export function HotelRoomsBookingClient({ hotel, roomImagesMap }: Props) {
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom>(hotel.rooms[0]);

  return (
    <>
      {/* Where you'll sleep */}
      <div className="py-8 border-b border-[var(--border-default)]" id="rooms">
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">Where you&apos;ll sleep</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hotel.rooms.map((room, i) => {
            const r2imgs = roomImagesMap[i] ?? [];
            const isSelected = selectedRoom.name === room.name;

            return (
              <div
                key={room.name}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedRoom(room)}
                onKeyDown={(e) => e.key === "Enter" && setSelectedRoom(room)}
                className={`rounded-[var(--radius-md)] border overflow-hidden transition-all cursor-pointer lg:cursor-default ${
                  isSelected
                    ? "border-[var(--primary)]"
                    : "border-[var(--border-default)] hover:border-[var(--primary)]"
                }`}
              >
                <RoomImageCarousel
                  images={r2imgs}
                  fallback={room.image}
                  alt={room.name}
                  available={room.available}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{room.name}</h3>
                      <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">{room.beds}</p>
                      {room.capacity && (
                        <div className="flex items-center gap-1 mt-1">
                          <Icon name="users" size="xs" color="var(--text-tertiary)" />
                          <span className="text-[12px] text-[var(--text-tertiary)]">
                            Max {maxOccupancyPerRoom(room)} guest{maxOccupancyPerRoom(room) !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    {isSelected && (
                      <span className="lg:hidden shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-[var(--radius-full)] text-[11px] font-bold bg-[var(--primary)] text-[var(--text-inverse)]">
                        <Icon name="check" size="xs" color="var(--on-dark)" />
                        Selected
                      </span>
                    )}
                  </div>

                  <p className="text-[16px] font-bold text-[var(--text-primary)] mt-2 tabular-nums">
                    {formatPrice(room.price)}{" "}
                    <span className="text-[13px] font-normal text-[var(--text-tertiary)]">/ night</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile booking bar — shares selectedRoom state with room cards */}
      <HotelMobileBookingBar
        hotel={hotel}
        selectedRoom={selectedRoom}
        onRoomChange={setSelectedRoom}
      />
    </>
  );
}
