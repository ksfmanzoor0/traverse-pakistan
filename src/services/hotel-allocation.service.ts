import { getSupabaseAdmin } from "@/lib/supabase/server";

export interface AllocatedRoom {
  roomId: string;
  name: string;
  peopleInRoom: number;
  maxOccupancy: number;
  singlePrice: number;
  extraOccupancyCharge: number;
  costForRoom: number;     // single + (people-1) × extra
}

export interface HotelAllocation {
  hotelSlug: string;
  hotelName: string;
  date: string;
  seasonLabel: string | null;
  people: number;
  rooms: AllocatedRoom[];
  totalCost: number;       // display price (hotel margin already included)
  warning?: string;
}

interface RoomCandidate {
  id: string;
  name: string;
  maxOccupancy: number;
  available: number;        // inventory cap (room count)
  singlePrice: number;      // 1-pax rate (falls back to doublePrice when not set)
  doublePrice: number;      // 2-pax rate — the canonical room rate
  extraCharge: number;      // per person above 2
}

/** cost for k people in this room: single rate for 1, double for 2,
 *  double + (k-2)*extra for 3+. */
function costForPeople(room: RoomCandidate, k: number): number {
  if (k <= 0) return 0;
  if (k === 1) return room.singlePrice;
  return room.doublePrice + Math.max(0, k - 2) * room.extraCharge;
}

/** MM-DD interval check; handles year-wrap like 11-01 → 03-31. */
function periodCoversDate(fromMmdd: string, toMmdd: string, mmdd: string): boolean {
  if (fromMmdd <= toMmdd) return mmdd >= fromMmdd && mmdd <= toMmdd;
  return mmdd >= fromMmdd || mmdd <= toMmdd;
}

/** Last 5 chars (MM-DD) of either YYYY-MM-DD or MM-DD. */
function toMmdd(v: string): string {
  return v.length === 10 ? v.slice(5) : v;
}

async function loadHotelForAllocation(slug: string): Promise<{
  hotelId: string;
  hotelName: string;
  rooms: Array<{
    id: string;
    name: string;
    capacity_adults: number | null;
    max_occupancy: number | null;
    available: number | null;
    single_price: number | null;
    price: number | null;
    extra_occupancy_charge: number | null;
    hotel_room_prices: Array<{
      season_id: string | null;
      single_price: number | null;
      price: number | null;
    }>;
  }>;
  seasons: Array<{
    id: string;
    label: string;
    hotel_season_periods: Array<{ from_date: string; to_date: string }>;
  }>;
} | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("hotels")
    .select(
      `id, name,
       hotel_rooms (
         id, name, capacity_adults, max_occupancy, available,
         single_price, price, extra_occupancy_charge, is_active,
         hotel_room_prices ( season_id, single_price, price )
       ),
       hotel_seasons ( id, label, hotel_season_periods ( from_date, to_date ) )`,
    )
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(`loadHotelForAllocation(${slug}): ${error.message}`);
  if (!data) return null;
  const row = data as unknown as {
    id: string;
    name: string;
    hotel_rooms: Array<{
      id: string;
      name: string;
      capacity_adults: number | null;
      max_occupancy: number | null;
      available: number | null;
      single_price: number | null;
      price: number | null;
      extra_occupancy_charge: number | null;
      is_active: boolean | null;
      hotel_room_prices: Array<{
        season_id: string | null;
        single_price: number | null;
        price: number | null;
      }>;
    }>;
    hotel_seasons: Array<{
      id: string;
      label: string;
      hotel_season_periods: Array<{ from_date: string; to_date: string }>;
    }>;
  };
  return {
    hotelId: row.id,
    hotelName: row.name,
    rooms: row.hotel_rooms.filter((r) => r.is_active !== false),
    seasons: row.hotel_seasons ?? [],
  };
}

/** Try every combination of room counts that fits N people, returning cheapest.
 *  Practical search bound: each room type c_i ∈ [0, ceil(N/maxOcc_i)] clipped by available. */
function allocate(rooms: RoomCandidate[], people: number): AllocatedRoom[] | null {
  if (people <= 0) return [];
  if (rooms.length === 0) return null;

  // Sort cheap-per-room first to bias enumeration
  const sorted = [...rooms].sort((a, b) => a.doublePrice - b.doublePrice);

  const maxCounts = sorted.map((r) =>
    Math.min(r.available, Math.ceil(people / Math.max(1, r.maxOccupancy))),
  );

  type Best = { allocation: AllocatedRoom[]; cost: number };
  const result: { best: Best | null } = { best: null };

  function recurse(idx: number, counts: number[]): void {
    if (idx === sorted.length) {
      const totalCapacity = counts.reduce((s, c, i) => s + c * sorted[i].maxOccupancy, 0);
      if (totalCapacity < people) return;

      // Greedy: pack densely into largest rooms first.
      const slots: { room: RoomCandidate }[] = [];
      counts.forEach((c, i) => {
        for (let k = 0; k < c; k += 1) slots.push({ room: sorted[i] });
      });
      slots.sort((a, b) => b.room.maxOccupancy - a.room.maxOccupancy);

      const allocation: AllocatedRoom[] = [];
      let remaining = people;
      let cost = 0;
      for (const s of slots) {
        if (remaining <= 0) break;
        const inThisRoom = Math.min(s.room.maxOccupancy, remaining);
        const roomCost = costForPeople(s.room, inThisRoom);
        allocation.push({
          roomId: s.room.id,
          name: s.room.name,
          peopleInRoom: inThisRoom,
          maxOccupancy: s.room.maxOccupancy,
          singlePrice: s.room.singlePrice,
          extraOccupancyCharge: s.room.extraCharge,
          costForRoom: roomCost,
        });
        cost += roomCost;
        remaining -= inThisRoom;
      }
      if (remaining > 0) return;
      if (!result.best || cost < result.best.cost) result.best = { allocation, cost };
      return;
    }
    for (let c = 0; c <= maxCounts[idx]; c += 1) {
      counts.push(c);
      recurse(idx + 1, counts);
      counts.pop();
    }
  }

  recurse(0, []);
  return result.best?.allocation ?? null;
}

export async function allocateHotelForNight(args: {
  hotelSlug: string;
  date: string;            // YYYY-MM-DD
  people: number;
}): Promise<HotelAllocation | null> {
  const hotel = await loadHotelForAllocation(args.hotelSlug);
  if (!hotel) return null;

  const mmdd = toMmdd(args.date);
  const activeSeason = hotel.seasons.find((s) =>
    s.hotel_season_periods.some((p) =>
      periodCoversDate(toMmdd(p.from_date), toMmdd(p.to_date), mmdd),
    ),
  );

  const candidates: RoomCandidate[] = hotel.rooms
    .map((r) => {
      const override = activeSeason
        ? r.hotel_room_prices.find((p) => p.season_id === activeSeason.id)
        : null;
      const extraCharge = r.extra_occupancy_charge ?? 0;
      // `price` = 2-pax room rate (display, season-overridden if available).
      // 1 person pays the same as 2 unless explicit single_price exists.
      const doublePrice = override?.price ?? r.price ?? null;
      if (doublePrice === null || doublePrice <= 0) return null;
      const explicitSingle = override?.single_price ?? r.single_price ?? null;
      const singlePrice = explicitSingle ?? doublePrice;
      const maxOcc = r.max_occupancy ?? r.capacity_adults ?? 2;
      const available = r.available ?? 99;
      return {
        id: r.id,
        name: r.name,
        maxOccupancy: Math.max(1, maxOcc),
        available: Math.max(0, available),
        singlePrice,
        doublePrice,
        extraCharge,
      } as RoomCandidate;
    })
    .filter((c): c is RoomCandidate => c !== null && c.available > 0);

  const allocation = allocate(candidates, args.people);
  const totalCost = (allocation ?? []).reduce((s, r) => s + r.costForRoom, 0);

  return {
    hotelSlug: args.hotelSlug,
    hotelName: hotel.hotelName,
    date: args.date,
    seasonLabel: activeSeason?.label ?? null,
    people: args.people,
    rooms: allocation ?? [],
    totalCost,
    warning: allocation === null ? `Could not fit ${args.people} people into available rooms.` : undefined,
  };
}

/** Sum hotel cost across all nights of a package's itinerary at the given tier. */
export interface PackageHotelQuote {
  packageSlug: string;
  tier: "deluxe" | "premium" | "luxury";
  people: number;
  startDate: string;
  totalCost: number;
  nights: Array<{
    dayNumber: number;
    date: string;
    hotelSlug: string | null;
    allocation: HotelAllocation | null;
  }>;
  warnings: string[];
}

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function quotePackageHotels(args: {
  packageSlug: string;
  tier: "deluxe" | "premium" | "luxury";
  people: number;
  startDate: string;
}): Promise<PackageHotelQuote | null> {
  const supabase = getSupabaseAdmin();
  const { data: pkg, error: pkgErr } = await supabase
    .from("packages")
    .select("slug")
    .eq("slug", args.packageSlug)
    .maybeSingle();
  if (pkgErr) throw new Error(`quotePackageHotels: ${pkgErr.message}`);
  if (!pkg) return null;

  const { data: days, error: daysErr } = await supabase
    .from("package_itinerary_days")
    .select("day_number, hotel_deluxe, hotel_luxury")
    .eq("package_slug", args.packageSlug)
    .order("day_number");
  if (daysErr) throw new Error(`quotePackageHotels days: ${daysErr.message}`);

  // Premium tier doesn't have a column on package_itinerary_days yet — falls
  // back to no allocation with a warning, so the engine returns 0 cleanly.
  if (args.tier === "premium") {
    return {
      packageSlug: args.packageSlug,
      tier: "premium",
      people: args.people,
      startDate: args.startDate,
      totalCost: 0,
      nights: [],
      warnings: ["Premium hotels are not configured for this package."],
    };
  }

  const tierKey = args.tier === "deluxe" ? "hotel_deluxe" : "hotel_luxury";
  const rows = (days ?? []) as Array<{ day_number: number; hotel_deluxe: string | null; hotel_luxury: string | null }>;

  // Hotel for day N is the overnight after day N. Last day has no hotel (return home).
  // We treat each day with a non-null hotel slug as a night billed on that day.
  const nights = await Promise.all(
    rows.map(async (r) => {
      const slug = r[tierKey] as string | null;
      const date = addDays(args.startDate, r.day_number - 1);
      const allocation = slug ? await allocateHotelForNight({ hotelSlug: slug, date, people: args.people }) : null;
      return { dayNumber: r.day_number, date, hotelSlug: slug, allocation };
    }),
  );

  const totalCost = nights.reduce((s, n) => s + (n.allocation?.totalCost ?? 0), 0);
  const warnings = nights
    .map((n) => n.allocation?.warning)
    .filter((w): w is string => Boolean(w));

  return {
    packageSlug: args.packageSlug,
    tier: args.tier,
    people: args.people,
    startDate: args.startDate,
    totalCost,
    nights,
    warnings,
  };
}
