"use client";

import { createContext, useContext, useReducer, useState, useMemo, useEffect } from "react";
import type { HotelRoom } from "@/types/hotel";

export interface RoomSelection {
  room: HotelRoom;
  qty: number;
  adults: number;
  children: number;
  infant: boolean;
}

type SelectionsMap = Map<string, RoomSelection>;

type Action =
  | { type: "SET_QTY"; room: HotelRoom; qty: number }
  | { type: "SET_ADULTS"; roomName: string; adults: number }
  | { type: "SET_CHILDREN"; roomName: string; children: number }
  | { type: "SET_INFANT"; roomName: string; infant: boolean }
  | { type: "RESTORE"; selections: SelectionsMap };

function reducer(state: SelectionsMap, action: Action): SelectionsMap {
  const next = new Map(state);
  switch (action.type) {
    case "SET_QTY": {
      if (action.qty <= 0) {
        next.delete(action.room.name);
      } else {
        const existing = next.get(action.room.name);
        next.set(action.room.name, {
          room: action.room,
          qty: action.qty,
          adults: existing?.adults ?? 2,
          children: existing?.children ?? 0,
          infant: existing?.infant ?? false,
        });
      }
      return next;
    }
    case "SET_ADULTS": {
      const sel = next.get(action.roomName);
      if (!sel) return state;
      next.set(action.roomName, { ...sel, adults: action.adults });
      return next;
    }
    case "SET_CHILDREN": {
      const sel = next.get(action.roomName);
      if (!sel) return state;
      next.set(action.roomName, { ...sel, children: action.children });
      return next;
    }
    case "SET_INFANT": {
      const sel = next.get(action.roomName);
      if (!sel) return state;
      next.set(action.roomName, { ...sel, infant: action.infant });
      return next;
    }
    case "RESTORE":
      return action.selections;
  }
}

interface HotelRoomCtx {
  selections: SelectionsMap;
  setQty: (room: HotelRoom, qty: number) => void;
  setAdults: (roomName: string, adults: number) => void;
  setChildren: (roomName: string, children: number) => void;
  setInfant: (roomName: string, infant: boolean) => void;
  totalRooms: number;
  totalAdults: number;
  totalChildren: number;
  hasInfant: boolean;
  hasSelections: boolean;
  checkIn: Date | null;
  checkOut: Date | null;
  setCheckIn: (d: Date | null) => void;
  setCheckOut: (d: Date | null) => void;
}

const HotelRoomContext = createContext<HotelRoomCtx | null>(null);

function storageKey(slug: string) { return `tp_hotel_${slug}`; }

interface ProviderProps {
  children: React.ReactNode;
  slug: string;
  rooms: HotelRoom[];
}

export function HotelRoomProvider({ children, slug, rooms }: ProviderProps) {
  const [selections, dispatch] = useReducer(reducer, new Map<string, RoomSelection>());
  const [checkIn, setCheckInState] = useState<Date | null>(null);
  const [checkOut, setCheckOutState] = useState<Date | null>(null);
  const [restored, setRestored] = useState(false);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(slug));
      if (raw) {
        const saved = JSON.parse(raw) as {
          checkIn?: string;
          checkOut?: string;
          selections?: { roomName: string; qty: number; adults: number; children: number; infant: boolean }[];
        };
        if (saved.checkIn) setCheckInState(new Date(saved.checkIn));
        if (saved.checkOut) setCheckOutState(new Date(saved.checkOut));
        if (saved.selections?.length) {
          const map = new Map<string, RoomSelection>();
          for (const s of saved.selections) {
            const room = rooms.find((r) => r.name === s.roomName);
            if (room) map.set(s.roomName, { room, qty: s.qty, adults: s.adults, children: s.children, infant: s.infant });
          }
          if (map.size > 0) dispatch({ type: "RESTORE", selections: map });
        }
      }
    } catch { /* ignore */ }
    setRestored(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist to sessionStorage whenever state changes (after restore)
  useEffect(() => {
    if (!restored) return;
    try {
      const payload = {
        checkIn: checkIn?.toISOString() ?? null,
        checkOut: checkOut?.toISOString() ?? null,
        selections: [...selections.values()].map((s) => ({
          roomName: s.room.name,
          qty: s.qty,
          adults: s.adults,
          children: s.children,
          infant: s.infant,
        })),
      };
      sessionStorage.setItem(storageKey(slug), JSON.stringify(payload));
    } catch { /* ignore */ }
  }, [slug, selections, checkIn, checkOut, restored]);

  const setCheckIn = (d: Date | null) => setCheckInState(d);
  const setCheckOut = (d: Date | null) => setCheckOutState(d);

  const totalRooms    = useMemo(() => [...selections.values()].reduce((s, v) => s + v.qty, 0), [selections]);
  const totalAdults   = useMemo(() => [...selections.values()].reduce((s, v) => s + v.adults, 0), [selections]);
  const totalChildren = useMemo(() => [...selections.values()].reduce((s, v) => s + v.children, 0), [selections]);
  const hasInfant     = useMemo(() => [...selections.values()].some((v) => v.infant), [selections]);

  const value: HotelRoomCtx = {
    selections,
    setQty:      (room, qty)          => dispatch({ type: "SET_QTY", room, qty }),
    setAdults:   (roomName, adults)   => dispatch({ type: "SET_ADULTS", roomName, adults }),
    setChildren: (roomName, children) => dispatch({ type: "SET_CHILDREN", roomName, children }),
    setInfant:   (roomName, infant)   => dispatch({ type: "SET_INFANT", roomName, infant }),
    totalRooms,
    totalAdults,
    totalChildren,
    hasInfant,
    hasSelections: selections.size > 0,
    checkIn,
    checkOut,
    setCheckIn,
    setCheckOut,
  };

  return <HotelRoomContext.Provider value={value}>{children}</HotelRoomContext.Provider>;
}

export function useHotelRoom(): HotelRoomCtx {
  const ctx = useContext(HotelRoomContext);
  if (!ctx) throw new Error("useHotelRoom must be used inside HotelRoomProvider");
  return ctx;
}
