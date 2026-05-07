"use client";

import { formatPrice } from "@/lib/utils";
import { RoomImageCarousel } from "@/components/hotels/RoomImageCarousel";
import { HotelMobileBookingBar } from "@/components/hotels/HotelMobileBookingBar";
import { useHotelRoom } from "@/components/hotels/HotelRoomContext";
import { Icon } from "@/components/ui/Icon";
import type { Hotel, RoomCapacity } from "@/types/hotel";

function capacityLabel(c: RoomCapacity): string {
  const parts: string[] = [];
  parts.push(c.adults === 1 ? "1 adult" : `${c.adults} adults`);
  if (c.children > 0) parts.push(c.children === 1 ? "1 child" : `${c.children} children`);
  return parts.join(" · ");
}

interface Props {
  hotel: Hotel;
  roomImagesMap: Record<number, string[]>;
}

export function HotelRoomsBookingClient({ hotel, roomImagesMap }: Props) {
  const { selectedRoom, setSelectedRoom } = useHotelRoom();

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
                onClick={() => setSelectedRoom(room)}
                className={`rounded-[var(--radius-md)] border overflow-hidden transition-all cursor-pointer ${
                  isSelected
                    ? "border-[var(--primary)] ring-1 ring-[var(--primary)]"
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
                        <p className="flex items-center gap-1 text-[12px] text-[var(--text-tertiary)] mt-1">
                          <Icon name="users" size="xs" className="shrink-0" />
                          {capacityLabel(room.capacity)}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 px-3 py-1 rounded-[var(--radius-full)] text-[12px] font-semibold border transition-colors ${
                        isSelected
                          ? "bg-[var(--primary)] text-[var(--text-inverse)] border-[var(--primary)]"
                          : "border-[var(--border-default)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </span>
                  </div>

                  <p className="text-[15px] font-bold text-[var(--text-primary)] mt-2 tabular-nums">
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
