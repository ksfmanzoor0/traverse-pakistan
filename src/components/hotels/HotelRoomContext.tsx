"use client";

import { createContext, useContext, useState } from "react";
import type { HotelRoom } from "@/types/hotel";

interface HotelRoomCtx {
  selectedRoom: HotelRoom;
  setSelectedRoom: (room: HotelRoom) => void;
}

const HotelRoomContext = createContext<HotelRoomCtx | null>(null);

export function HotelRoomProvider({
  children,
  initialRoom,
}: {
  children: React.ReactNode;
  initialRoom: HotelRoom;
}) {
  const [selectedRoom, setSelectedRoom] = useState<HotelRoom>(initialRoom);
  return (
    <HotelRoomContext.Provider value={{ selectedRoom, setSelectedRoom }}>
      {children}
    </HotelRoomContext.Provider>
  );
}

export function useHotelRoom(): HotelRoomCtx {
  const ctx = useContext(HotelRoomContext);
  if (!ctx) throw new Error("useHotelRoom must be used inside HotelRoomProvider");
  return ctx;
}
