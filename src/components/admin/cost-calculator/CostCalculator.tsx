"use client";

import { useMemo, useState } from "react";

export interface PackagePickerEntry {
  slug: string;
  name: string;
  duration: number;
  startingCities: string[];
}

type HomeCity = "ISB" | "LHE" | "KHI";

interface QuoteResponse {
  slug: string;
  name: string;
  duration: number;
  nights: number;
  startingCities: string[];
  allowPradoNCP: boolean;
  tier: "deluxe" | "premium" | "luxury";
  people: number;
  totalDistanceKm: number;
  baseDistanceKm: number;
  extensionKm: number;
  flightRequired: boolean;
  flightCostPerPerson: number;
  flightBreakdown: Array<{
    from: string;
    to: string;
    date: string;
    perPerson: number;
    source: string;
    carriers: { airline: string; fare: number }[];
  }>;
  homeInStartingCities: boolean;
  hotelTotalCost: number;
  hotelNights: Array<{
    dayNumber: number;
    date: string;
    hotelSlug: string | null;
    hotelName: string | null;
    seasonLabel: string | null;
    rooms: Array<{
      roomId: string;
      name: string;
      peopleInRoom: number;
      maxOccupancy: number;
      singlePrice: number;
      extraOccupancyCharge: number;
      costForRoom: number;
    }>;
    totalCost: number;
  }>;
  hotelWarnings: string[];
  hotelsInPackage: Array<{
    slug: string;
    name: string;
    tier: string;
    pricePerNight: number;
    usedInSlots: ("deluxe" | "luxury")[];
  }>;
}

function defaultStartDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 30);
  return d.toISOString().slice(0, 10);
}

type TransportName = "Corolla" | "BRV" | "Hiace Grand Cabin" | "Coaster" | "Prado" | "PradoNCP";

interface TransportType {
  avgKmPerLitre: number;
  maxPeople: number;     // comfort capacity = treated as max
  rentPerDay: number;
}

interface HotelCategory {
  hotelName: string;
  roomRatePerNight: number;
  includedPeoplePerRoom: number;
  maxPeoplePerRoom: number;
  extraPersonCostPerNight: number;
}

export interface VehicleEntry {
  id: string;
  code: string;
  displayName: string;
  kmPerLitre: number;
  maxPeople: number;
  rentPerDay: number;
  isNcp: boolean;
  ncpPairCode: string | null;
}

function buildTransportFromVehicles(vehicles: VehicleEntry[]): Record<string, TransportType> {
  const out: Record<string, TransportType> = {};
  for (const v of vehicles) {
    out[v.displayName] = {
      avgKmPerLitre: v.kmPerLitre,
      maxPeople: v.maxPeople,
      rentPerDay: v.rentPerDay,
    };
  }
  return out;
}

const INITIAL_HOTELS: Record<string, HotelCategory> = {
  deluxe: {
    hotelName: "Deluxe Hotel",
    roomRatePerNight: 8000,
    includedPeoplePerRoom: 2,
    maxPeoplePerRoom: 4,
    extraPersonCostPerNight: 2000,
  },
  premium: {
    hotelName: "Premium Hotel",
    roomRatePerNight: 12000,
    includedPeoplePerRoom: 2,
    maxPeoplePerRoom: 4,
    extraPersonCostPerNight: 4000,
  },
  luxury: {
    hotelName: "Luxury Hotel",
    roomRatePerNight: 18000,
    includedPeoplePerRoom: 2,
    maxPeoplePerRoom: 4,
    extraPersonCostPerNight: 5000,
  },
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pkr(v: number): string {
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(v || 0);
}

function getDefaultTransport(people: number): TransportName {
  if (people <= 3) return "Corolla";
  if (people <= 4) return "BRV";
  if (people <= 11) return "Hiace Grand Cabin";
  return "Coaster";
}

function getAutoExtras(
  people: number,
  main: TransportName,
  keepSameType: boolean,
): Partial<Record<TransportName, number>> {
  const caps: Record<TransportName, number> = {
    Corolla: 3,
    BRV: 4,
    "Hiace Grand Cabin": 11,
    Coaster: 21,
    Prado: 4,
    PradoNCP: 4,
  };
  const extras: Partial<Record<TransportName, number>> = {};
  const mainCap = caps[main] || 0;
  if (people <= mainCap) return extras;

  if (keepSameType) {
    const displayName = main === "PradoNCP" ? "Prado" : main;
    const totalRequired = Math.ceil(people / mainCap);
    extras[displayName as TransportName] = Math.max(0, totalRequired - 1);
    return extras;
  }

  let remaining = people - mainCap;
  const order: { name: TransportName; cap: number }[] = [
    { name: "Corolla", cap: 3 },
    { name: "BRV", cap: 4 },
    { name: "Hiace Grand Cabin", cap: 11 },
    { name: "Coaster", cap: 21 },
  ];
  while (remaining > 0) {
    const fit = order.find((o) => remaining <= o.cap);
    if (fit) {
      extras[fit.name] = (extras[fit.name] || 0) + 1;
      remaining = 0;
    } else {
      extras.Coaster = (extras.Coaster || 0) + 1;
      remaining -= 21;
    }
  }
  return extras;
}

interface TripConfig {
  tripName: string;
  totalDistanceKm: number;
  numberOfDays: number;
  numberOfNights: number;
  fuelPricePerLitre: number;
  profitPercentage: number;
  guidePerDay: number;
  jeepCostPerJeep: number;
  jeepCapacity: number;
  flightCostPerPerson: number;
  flightRequired: boolean;
  jeepRequired: boolean;
  allowPradoNCP: boolean;
}

interface UserInput {
  people: number;
  hotelType: keyof typeof INITIAL_HOTELS;
  requestedRooms: number;
  addGuide: boolean;
  includeFlights: boolean;
  selectedTransport: TransportName;
  manualTransport: boolean;
  extraTransports: Partial<Record<TransportName, number>>;
  extraTransportType: TransportName;
  extraTransportQty: number;
  extraTransportManual: boolean;
}

export interface EngineConfigEntry {
  fuelPricePerLitre: number;
  profitPercentage: number;
  packageBufferKm: number;
  lheExtensionKm: number;
  guidePerDay: number;
}

export interface HotelTierSummary {
  tier: string;       // 'deluxe' | 'premium' | 'luxury'
  hotels: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

export interface PackageLinkedHotel {
  slug: string;
  name: string;
  tier: string;
  pricePerNight: number;
  usedInSlots: ("deluxe" | "luxury")[];
}

export function CostCalculator({
  skarduPackages = [],
  vehicles = [],
  engineConfig,
  hotelTiers = [],
  allHotels = [],
}: {
  skarduPackages?: PackagePickerEntry[];
  vehicles?: VehicleEntry[];
  engineConfig?: EngineConfigEntry;
  hotelTiers?: HotelTierSummary[];
  allHotels?: PackageLinkedHotel[];
}) {
  const [picker, setPicker] = useState({
    slug: skarduPackages[0]?.slug ?? "",
    home: "ISB" as HomeCity,
    startDate: defaultStartDate(),
    tier: "deluxe" as "deluxe" | "premium" | "luxury",
    people: 2,
  });
  const [pickerLoading, setPickerLoading] = useState(false);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [appliedMessage, setAppliedMessage] = useState<string | null>(null);
  const [lastQuote, setLastQuote] = useState<QuoteResponse | null>(null);

  const [trip, setTrip] = useState<TripConfig>({
    tripName: "Hunza Valley Tour",
    totalDistanceKm: 1800,
    numberOfDays: 6,
    numberOfNights: 5,
    fuelPricePerLitre: engineConfig?.fuelPricePerLitre ?? 285,
    profitPercentage: engineConfig?.profitPercentage ?? 20,
    guidePerDay: engineConfig?.guidePerDay ?? 5000,
    jeepCostPerJeep: 18000,
    jeepCapacity: 6,
    flightCostPerPerson: 0,
    flightRequired: false,
    jeepRequired: true,
    allowPradoNCP: false,
  });

  const [transportTypes] = useState(() => buildTransportFromVehicles(vehicles));
  // Show all vehicles (including NCP variants) so operator can pick the exact
  // one. NCP variants are auto-selected for KDU/GIL packages.
  const customerTransportOptions = useMemo(
    () => vehicles.map((v) => v.displayName),
    [vehicles],
  );

  /** Vehicle display name marked as NCP for KDU/GIL eligibility, if any. */
  const ncpPradoName = useMemo(
    () => vehicles.find((v) => v.isNcp && v.ncpPairCode === "prado")?.displayName ?? "Prado",
    [vehicles],
  );

  /** Look up the NCP variant of a given display name. */
  const ncpDisplayName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const v of vehicles) {
      if (v.isNcp && v.ncpPairCode) {
        const base = vehicles.find((b) => b.code === v.ncpPairCode);
        if (base) map[base.displayName] = v.displayName;
      }
    }
    return map;
  }, [vehicles]);

  function maybeSwapNcp(displayName: string, allow: boolean): string {
    if (!allow) return displayName;
    return ncpDisplayName[displayName] ?? displayName;
  }
  const [hotelCategories, setHotelCategories] = useState(INITIAL_HOTELS);

  const [user, setUser] = useState<UserInput>({
    people: 4,
    hotelType: "deluxe",
    requestedRooms: 1,
    addGuide: false,
    includeFlights: false,
    selectedTransport: "Corolla",
    manualTransport: false,
    extraTransports: {},
    extraTransportType: "Corolla",
    extraTransportQty: 1,
    extraTransportManual: false,
  });

  const updateTrip = <K extends keyof TripConfig>(field: K, value: TripConfig[K]) =>
    setTrip((p) => ({ ...p, [field]: value }));

  const updateUser = <K extends keyof UserInput>(field: K, value: UserInput[K]) => {
    setUser((prev) => {
      const next = { ...prev, [field]: value } as UserInput;
      if (field === "people") {
        const people = num(value);
        const auto = getDefaultTransport(people);
        if (!prev.manualTransport) next.selectedTransport = auto;
        if (!prev.extraTransportManual) {
          next.extraTransports = getAutoExtras(
            people,
            prev.manualTransport ? prev.selectedTransport : auto,
            prev.manualTransport,
          );
        }
      }
      if (field === "selectedTransport") {
        next.manualTransport = true;
        if (!prev.extraTransportManual) {
          next.extraTransports = getAutoExtras(num(prev.people), value as TransportName, true);
        }
      }
      return next;
    });
  };

  const addExtra = () =>
    setUser((p) => ({
      ...p,
      extraTransportManual: true,
      extraTransports: {
        ...p.extraTransports,
        [p.extraTransportType]: (p.extraTransports[p.extraTransportType] || 0) + Math.max(1, num(p.extraTransportQty)),
      },
      extraTransportQty: 1,
    }));

  const removeExtra = (name: TransportName) =>
    setUser((p) => {
      const next = { ...p.extraTransports };
      delete next[name];
      return { ...p, extraTransports: next };
    });

  const calc = useMemo(() => {
    const people = Math.max(1, num(user.people));
    const days = Math.max(1, num(trip.numberOfDays));
    const nights = Math.max(1, num(trip.numberOfNights));
    const distance = Math.max(0, num(trip.totalDistanceKm));
    const fuelPrice = Math.max(0, num(trip.fuelPricePerLitre));
    const profitPct = Math.max(0, num(trip.profitPercentage));

    const actualMain: TransportName = maybeSwapNcp(user.selectedTransport, trip.allowPradoNCP) as TransportName;

    const counts: Partial<Record<TransportName, number>> = { [actualMain]: 1 };
    Object.entries(user.extraTransports).forEach(([name, count]) => {
      const actualName = maybeSwapNcp(name, trip.allowPradoNCP) as TransportName;
      counts[actualName] = (counts[actualName] || 0) + Math.max(0, num(count));
    });

    const totalCapacity = Object.entries(counts).reduce(
      (s, [name, c]) => s + (transportTypes[name as TransportName]?.maxPeople || 0) * (c || 0),
      0,
    );

    const totalFuelLitres = Object.entries(counts).reduce((s, [name, c]) => {
      const t = transportTypes[name as TransportName];
      if (!t?.avgKmPerLitre) return s;
      return s + (distance / t.avgKmPerLitre) * (c || 0);
    }, 0);

    const fuelCost = totalFuelLitres * fuelPrice;

    const rentCost = Object.entries(counts).reduce((s, [name, c]) => {
      const t = transportTypes[name as TransportName];
      return s + (t?.rentPerDay || 0) * days * (c || 0);
    }, 0);

    const transportSummary = Object.entries(counts)
      .filter(([, c]) => (c || 0) > 0)
      .map(([name, c]) => `${c} × ${name}`)
      .join(" + ");

    const requiredJeeps = trip.jeepRequired ? Math.ceil(people / Math.max(1, num(trip.jeepCapacity))) : 0;
    const jeepCost = requiredJeeps * num(trip.jeepCostPerJeep);

    const hotel = hotelCategories[user.hotelType];
    const maxRoom = Math.max(1, hotel.maxPeoplePerRoom);
    const incRoom = Math.max(1, hotel.includedPeoplePerRoom);
    const minRooms = Math.ceil(people / maxRoom);
    const finalRooms = Math.max(num(user.requestedRooms), minRooms);
    const includedTotal = finalRooms * incRoom;
    const extraPeople = Math.max(0, people - includedTotal);
    const placeholderRoomBase = finalRooms * hotel.roomRatePerNight * nights;
    const placeholderExtraCost = extraPeople * hotel.extraPersonCostPerNight * nights;
    const placeholderHotelCost = placeholderRoomBase + placeholderExtraCost;

    // When a real package is picked, override placeholder with knapsack total.
    const useRealHotel = lastQuote !== null && lastQuote.hotelNights.length > 0;
    const roomBase = useRealHotel ? 0 : placeholderRoomBase;
    const extraCost = useRealHotel ? 0 : placeholderExtraCost;
    const hotelCost = useRealHotel ? (lastQuote?.hotelTotalCost ?? 0) : placeholderHotelCost;

    const guideCost = user.addGuide ? num(trip.guidePerDay) * days : 0;
    const flightCost = trip.flightRequired && user.includeFlights ? num(trip.flightCostPerPerson) * people : 0;

    const transportCost = rentCost + fuelCost + jeepCost;
    const subtotal = transportCost + hotelCost + guideCost + flightCost;
    const profit = subtotal * (profitPct / 100);
    const total = subtotal + profit;
    const perPerson = total / people;

    return {
      people,
      transportSummary,
      counts,
      totalCapacity,
      totalFuelLitres,
      fuelCost,
      rentCost,
      requiredJeeps,
      jeepCost,
      transportCost,
      minRooms,
      finalRooms,
      extraPeople,
      roomBase,
      extraCost,
      hotelCost,
      guideCost,
      flightCost,
      subtotal,
      profit,
      total,
      perPerson,
      roomWarning:
        num(user.requestedRooms) < minRooms
          ? `Requested rooms not enough. Auto-bumped to ${minRooms}.`
          : "",
      transportWarning:
        totalCapacity < people ? `Selected transport capacity is short for ${people} people.` : "",
      mattressWarning: extraPeople > 0 ? `${extraPeople} extra person(s) on mattress.` : "",
      flightWarning:
        trip.flightRequired && user.includeFlights
          ? "Flight cost is not final and may change with airline availability."
          : "",
      actualMain,
    };
  }, [trip, transportTypes, hotelCategories, user, lastQuote]);

  async function applyPicker() {
    if (!picker.slug) return;
    setPickerLoading(true);
    setPickerError(null);
    try {
      const qs = new URLSearchParams({
        slug: picker.slug,
        home: picker.home,
        startDate: picker.startDate,
        tier: picker.tier,
        people: String(picker.people),
      });
      const res = await fetch(`/api/admin/cost-calculator/quote?${qs.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? "Failed to fetch quote");
      }
      const q = (await res.json()) as QuoteResponse;
      setLastQuote(q);
      setTrip((p) => ({
        ...p,
        tripName: q.name,
        numberOfDays: q.duration,
        numberOfNights: q.nights,
        totalDistanceKm: q.totalDistanceKm,
        flightRequired: q.flightRequired,
        flightCostPerPerson: q.flightCostPerPerson,
        allowPradoNCP: q.allowPradoNCP,
      }));
      setUser((p) => ({
        ...p,
        includeFlights: q.flightRequired,
        people: q.people,
        hotelType: q.tier === "luxury" ? "luxury" : q.tier === "premium" ? "premium" : "deluxe",
        // Skardu/Gilgit (NCP-eligible) packages default to the Prado NCP
        // variant explicitly so the operator sees it in the dropdown.
        selectedTransport: q.allowPradoNCP ? (ncpPradoName as TransportName) : (getDefaultTransport(q.people) as TransportName),
        manualTransport: false,
        extraTransports: q.allowPradoNCP ? {} : getAutoExtras(q.people, getDefaultTransport(q.people), false),
      }));
      const parts: string[] = [];
      parts.push(`${q.duration} days / ${q.nights} nights`);
      parts.push(`${q.totalDistanceKm.toLocaleString()} km`);
      if (q.flightCostPerPerson > 0) parts.push(`flight PKR ${q.flightCostPerPerson.toLocaleString()}/person`);
      if (q.hotelTotalCost > 0) parts.push(`hotel PKR ${q.hotelTotalCost.toLocaleString()} total`);
      if (q.allowPradoNCP) parts.push(`NCP rate on`);
      setAppliedMessage(`Applied "${q.name}" — ${parts.join(" · ")}. Configuration & quote below updated.`);
      setTimeout(() => setAppliedMessage(null), 8000);
    } catch (err) {
      setPickerError((err as Error).message);
    } finally {
      setPickerLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Skardu package picker */}
      {skarduPackages.length > 0 && (
        <section
          className="rounded-lg p-5 space-y-3"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
        >
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Auto-fill from Skardu package
            </h2>
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              {skarduPackages.length} fly-in packages · KDU-starting · PradoNCP rate auto-on
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-6">
            <label className="block text-sm sm:col-span-2">
              <span style={{ color: "var(--text-secondary)" }}>Package</span>
              <select
                className="mt-1 w-full rounded px-2 py-2 text-sm"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                value={picker.slug}
                onChange={(e) => setPicker((p) => ({ ...p, slug: e.target.value }))}
              >
                {skarduPackages.map((p) => (
                  <option key={p.slug} value={p.slug}>{p.name} ({p.duration}d)</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Home</span>
              <select
                className="mt-1 w-full rounded px-2 py-2 text-sm"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                value={picker.home}
                onChange={(e) => setPicker((p) => ({ ...p, home: e.target.value as HomeCity }))}
              >
                {(["ISB", "LHE", "KHI"] as HomeCity[]).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Tier</span>
              <select
                className="mt-1 w-full rounded px-2 py-2 text-sm"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                value={picker.tier}
                onChange={(e) => setPicker((p) => ({ ...p, tier: e.target.value as "deluxe" | "premium" | "luxury" }))}
              >
                <option value="deluxe">Deluxe</option>
                <option value="premium" disabled>
                  Premium (not yet on any package)
                </option>
                <option value="luxury">Luxury</option>
              </select>
            </label>
            <label className="block text-sm">
              <span style={{ color: "var(--text-secondary)" }}>People</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded px-2 py-2 text-sm"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                value={picker.people}
                onChange={(e) => setPicker((p) => ({ ...p, people: Math.max(1, num(e.target.value)) }))}
              />
            </label>
            <label className="block text-sm">
              <span style={{ color: "var(--text-secondary)" }}>Start date</span>
              <input
                type="date"
                className="mt-1 w-full rounded px-2 py-2 text-sm"
                style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                value={picker.startDate}
                onChange={(e) => setPicker((p) => ({ ...p, startDate: e.target.value }))}
              />
            </label>
            <button
              type="button"
              className="mt-5 rounded px-4 py-2.5 text-sm font-semibold self-start sm:col-span-6 bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-60"
              onClick={applyPicker}
              disabled={pickerLoading}
            >
              {pickerLoading ? "Loading…" : "Apply selection — auto-fill trip config below"}
            </button>
          </div>
          {pickerError && (
            <div className="text-sm" style={{ color: "var(--accent-danger)" }}>{pickerError}</div>
          )}
          {appliedMessage && (
            <div
              className="text-sm rounded-md px-3 py-2 bg-emerald-50 border border-emerald-300"
              style={{ color: "#065f46" }}
            >
              ✓ {appliedMessage}
            </div>
          )}
          {lastQuote && (
            <div
              className="rounded-md p-3 text-xs space-y-1"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              <div style={{ color: "var(--text-tertiary)" }}>
                Flight cost loaded · {lastQuote.duration} days · home in starting:{" "}
                {String(lastQuote.homeInStartingCities)}
              </div>
              {lastQuote.flightBreakdown.length === 0 ? (
                <div style={{ color: "var(--text-tertiary)" }}>No flight legs.</div>
              ) : (
                lastQuote.flightBreakdown.map((l, i) => (
                  <div key={i} className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                    <span>{l.from}→{l.to} ({l.date}) · {l.source} {l.carriers.map((c) => c.airline).join(",")}</span>
                    <span>PKR {l.perPerson.toLocaleString()}</span>
                  </div>
                ))
              )}
              <div className="flex justify-between pt-1" style={{ borderTop: "1px solid var(--border-default)", color: "var(--text-primary)", fontWeight: 600 }}>
                <span>Per person flight</span>
                <span>PKR {lastQuote.flightCostPerPerson.toLocaleString()}</span>
              </div>
            </div>
          )}
          {lastQuote && (
            <div
              className="rounded-md p-3 text-xs space-y-1"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              <div style={{ color: "var(--text-tertiary)" }}>
                Vehicle distance loaded for {lastQuote.duration} days
              </div>
              <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                <span>Package base distance</span>
                <span>{lastQuote.baseDistanceKm.toLocaleString()} km</span>
              </div>
              {lastQuote.extensionKm > 0 && (
                <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                  <span>LHE extension (ISB↔LHE round-trip)</span>
                  <span>+{lastQuote.extensionKm.toLocaleString()} km</span>
                </div>
              )}
              <div className="flex justify-between pt-1" style={{ borderTop: "1px solid var(--border-default)", color: "var(--text-primary)", fontWeight: 600 }}>
                <span>Total distance for engine</span>
                <span>{lastQuote.totalDistanceKm.toLocaleString()} km</span>
              </div>
            </div>
          )}
          {lastQuote && lastQuote.hotelNights.length > 0 && (
            <div
              className="rounded-md p-3 text-xs space-y-1"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
            >
              <div style={{ color: "var(--text-tertiary)" }}>
                Hotel allocation · {lastQuote.tier} tier · {lastQuote.people} people
              </div>
              {lastQuote.hotelNights.map((n) => (
                <div key={n.dayNumber} className="space-y-0.5">
                  <div className="flex justify-between" style={{ color: "var(--text-secondary)" }}>
                    <span>
                      Day {n.dayNumber} · {n.date} · {n.hotelName ?? "—"}{" "}
                      {n.seasonLabel ? <span style={{ color: "var(--text-tertiary)" }}>({n.seasonLabel})</span> : null}
                    </span>
                    <span>PKR {n.totalCost.toLocaleString()}</span>
                  </div>
                  {n.rooms.map((r, i) => (
                    <div key={i} className="pl-3 flex justify-between" style={{ color: "var(--text-tertiary)" }}>
                      <span>
                        {r.name} · {r.peopleInRoom}/{r.maxOccupancy} ppl
                      </span>
                      <span>PKR {r.costForRoom.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="flex justify-between pt-1" style={{ borderTop: "1px solid var(--border-default)", color: "var(--text-primary)", fontWeight: 600 }}>
                <span>Hotel total ({lastQuote.hotelNights.length} nights)</span>
                <span>PKR {lastQuote.hotelTotalCost.toLocaleString()}</span>
              </div>
              {lastQuote.hotelWarnings.length > 0 && (
                <div className="text-xs" style={{ color: "var(--accent-danger)" }}>
                  {lastQuote.hotelWarnings.join(" · ")}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Trip config */}
      <section
        className="rounded-lg p-5 space-y-4"
        style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
      >
        <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
          Trip configuration
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <LabelledInput label="Trip name" value={trip.tripName} onChange={(v) => updateTrip("tripName", v)} />
          <LabelledInput label="Distance (km)" type="number" value={trip.totalDistanceKm} onChange={(v) => updateTrip("totalDistanceKm", num(v))} />
          <LabelledInput label="Days" type="number" value={trip.numberOfDays} onChange={(v) => updateTrip("numberOfDays", num(v))} />
          <LabelledInput label="Nights" type="number" value={trip.numberOfNights} onChange={(v) => updateTrip("numberOfNights", num(v))} />
          <LabelledInput label="Fuel / litre" type="number" value={trip.fuelPricePerLitre} onChange={(v) => updateTrip("fuelPricePerLitre", num(v))} />
          <LabelledInput label="Profit %" type="number" value={trip.profitPercentage} onChange={(v) => updateTrip("profitPercentage", num(v))} />
          <LabelledInput label="Guide / day" type="number" value={trip.guidePerDay} onChange={(v) => updateTrip("guidePerDay", num(v))} />
          {trip.jeepRequired && (
            <>
              <LabelledInput label="Jeep / jeep" type="number" value={trip.jeepCostPerJeep} onChange={(v) => updateTrip("jeepCostPerJeep", num(v))} />
              <LabelledInput label="Jeep capacity" type="number" value={trip.jeepCapacity} onChange={(v) => updateTrip("jeepCapacity", num(v))} />
            </>
          )}
          <LabelledInput label="Flight / person" type="number" value={trip.flightCostPerPerson} onChange={(v) => updateTrip("flightCostPerPerson", num(v))} />
          <Checkbox label="Flight option available" checked={trip.flightRequired} onChange={(c) => updateTrip("flightRequired", c)} />
          <Checkbox label="Allow NCP Prado rate (auto on for KDU/GIL packages)" checked={trip.allowPradoNCP} onChange={(c) => updateTrip("allowPradoNCP", c)} />
          <Checkbox label="Jeep required" checked={trip.jeepRequired} onChange={(c) => updateTrip("jeepRequired", c)} />
        </div>
      </section>


      {/* Hotel categories — when a package is picked, show its hotels grouped by tier */}
      {lastQuote && lastQuote.hotelsInPackage.length > 0 ? (
        <section
          className="rounded-lg p-5 space-y-3"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            Hotel categories{" "}
            <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
              (hotels in {lastQuote.name})
            </span>
          </h2>
          {(["deluxe", "premium", "luxury"] as const).map((tierKey) => {
            const hotelsAtTier = lastQuote.hotelsInPackage.filter((h) => h.tier === tierKey);
            const greyed = tierKey === "premium" && hotelsAtTier.length === 0;
            return (
              <div key={tierKey} className="space-y-1.5" style={{ opacity: greyed ? 0.5 : 1 }}>
                <div className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                  {tierKey}
                  {greyed && (
                    <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>(no hotels in this package)</span>
                  )}
                </div>
                {hotelsAtTier.length === 0 ? null : hotelsAtTier.map((h) => (
                  <div
                    key={h.slug}
                    className="grid gap-2 rounded-md p-2 text-sm items-center"
                    style={{
                      gridTemplateColumns: "1fr 140px 180px",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <div style={{ color: "var(--text-primary)" }}>
                      {h.name}
                      <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>{h.slug}</span>
                    </div>
                    <div style={{ color: "var(--text-secondary)" }}>
                      {h.pricePerNight > 0 ? `PKR ${h.pricePerNight.toLocaleString()}/night` : "—"}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                      used as: {h.usedInSlots.join(" + ") || "—"}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </section>
      ) : (
        allHotels.length > 0 && (
          <section
            className="rounded-lg p-5 space-y-3"
            style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
          >
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Hotel categories{" "}
              <span style={{ color: "var(--text-tertiary)", fontWeight: 400 }}>
                (all package-linked hotels — pick a package above to filter)
              </span>
            </h2>
            {(["deluxe", "premium", "luxury"] as const).map((tierKey) => {
              const hotelsAtTier = allHotels.filter((h) => h.tier === tierKey);
              const greyed = tierKey === "premium" && hotelsAtTier.length === 0;
              return (
                <div key={tierKey} className="space-y-1.5" style={{ opacity: greyed ? 0.5 : 1 }}>
                  <div className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
                    {tierKey} <span className="ml-1 text-xs" style={{ color: "var(--text-tertiary)" }}>({hotelsAtTier.length})</span>
                    {greyed && (
                      <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>(no hotels)</span>
                    )}
                  </div>
                  {hotelsAtTier.map((h) => (
                    <div
                      key={h.slug}
                      className="grid gap-2 rounded-md p-2 text-sm items-center"
                      style={{
                        gridTemplateColumns: "1fr 160px 160px",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-default)",
                      }}
                    >
                      <div style={{ color: "var(--text-primary)" }}>
                        {h.name}
                        <span className="ml-2 text-xs" style={{ color: "var(--text-tertiary)" }}>{h.slug}</span>
                      </div>
                      <div style={{ color: "var(--text-secondary)" }}>
                        {h.pricePerNight > 0 ? `PKR ${h.pricePerNight.toLocaleString()}/night` : "—"}
                      </div>
                      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                        used as: {h.usedInSlots.join(" + ") || "—"}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </section>
        )
      )}

      {/* Customer quote */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section
          className="rounded-lg p-5 space-y-3 lg:col-span-1"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            Customer inputs
          </h2>

          <LabelledInput label="Number of people" type="number" value={user.people} onChange={(v) => updateUser("people", num(v))} />

          <label className="block text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Hotel tier</span>
            <select
              className="mt-1 w-full rounded px-2 py-2"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              value={user.hotelType}
              onChange={(e) => updateUser("hotelType", e.target.value as keyof typeof INITIAL_HOTELS)}
            >
              {Object.keys(hotelCategories)
                .filter((c) => c !== "premium")
                .map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
            </select>
          </label>

          <LabelledInput label="Requested rooms" type="number" value={user.requestedRooms} onChange={(v) => updateUser("requestedRooms", num(v))} />

          <label className="block text-sm">
            <span style={{ color: "var(--text-secondary)" }}>Main transport</span>
            <select
              className="mt-1 w-full rounded px-2 py-2"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
              value={user.selectedTransport}
              onChange={(e) => updateUser("selectedTransport", e.target.value as TransportName)}
            >
              {customerTransportOptions.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>

          <div
            className="rounded-md p-3 space-y-2"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
          >
            <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Extra vehicles</div>
            <div className="grid grid-cols-[1fr_70px_auto] gap-2">
              <select
                className="rounded px-2 py-1.5 text-sm"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                value={user.extraTransportType}
                onChange={(e) => updateUser("extraTransportType", e.target.value as TransportName)}
              >
                {customerTransportOptions.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                className="rounded px-2 py-1.5 text-sm"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
                value={user.extraTransportQty}
                onChange={(e) => updateUser("extraTransportQty", num(e.target.value))}
              />
              <button
                type="button"
                className="rounded px-3 py-1.5 text-sm"
                style={{ background: "var(--accent-primary)", color: "var(--on-dark)" }}
                onClick={addExtra}
              >
                Add
              </button>
            </div>
            {Object.entries(user.extraTransports).filter(([, c]) => (c || 0) > 0).map(([name, count]) => (
              <div key={name} className="flex items-center justify-between text-sm rounded px-2 py-1.5"
                   style={{ background: "var(--bg-primary)" }}>
                <span style={{ color: "var(--text-primary)" }}>{count} × {name}</span>
                <button type="button" className="text-xs" style={{ color: "var(--accent-danger)" }}
                        onClick={() => removeExtra(name as TransportName)}>Remove</button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="w-full rounded px-3 py-2 text-sm"
            style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
            onClick={() =>
              setUser((p) => ({
                ...p,
                selectedTransport: getDefaultTransport(num(p.people)),
                manualTransport: false,
                extraTransportManual: false,
                extraTransports: getAutoExtras(num(p.people), getDefaultTransport(num(p.people)), false),
              }))
            }
          >
            Reset to auto transport
          </button>

          <Checkbox label="Add guide" checked={user.addGuide} onChange={(c) => updateUser("addGuide", c)} />
          {trip.flightRequired && (
            <Checkbox label="Include flights" checked={user.includeFlights} onChange={(c) => updateUser("includeFlights", c)} />
          )}
        </section>

        {/* Result */}
        <section
          className="rounded-lg p-5 space-y-4 lg:col-span-2"
          style={{ background: "var(--bg-primary)", border: "1px solid var(--border-default)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>Quote</h2>

          <div className="grid gap-3 sm:grid-cols-3">
            <ResultCard label="Total" value={pkr(calc.total)} primary />
            <ResultCard label="Per person" value={pkr(calc.perPerson)} primary />
            <ResultCard label="Vehicles" value={calc.transportSummary || "—"} />
          </div>

          {calc.roomWarning && <Warning text={calc.roomWarning} />}
          {calc.transportWarning && <Warning text={calc.transportWarning} />}
          {calc.mattressWarning && <Warning text={calc.mattressWarning} />}
          {calc.flightWarning && <Warning text={calc.flightWarning} />}

          <div className="grid gap-3 md:grid-cols-2">
            <Breakdown title="Transport">
              <Line label="Rent" value={pkr(calc.rentCost)} />
              <Line label="Fuel (litres)" value={`${calc.totalFuelLitres.toFixed(1)} L`} />
              <Line label="Fuel cost" value={pkr(calc.fuelCost)} />
              <Line label="Jeeps" value={`${calc.requiredJeeps}`} />
              <Line label="Jeep cost" value={pkr(calc.jeepCost)} />
              <Line label="Main vehicle (costed)" value={calc.actualMain} />
              <Line label="Transport total" value={pkr(calc.transportCost)} bold />
            </Breakdown>

            <Breakdown title="Hotel + guide + flight">
              <Line label="Rooms" value={`${calc.finalRooms} (min ${calc.minRooms})`} />
              <Line label="Extra people charged" value={`${calc.extraPeople}`} />
              <Line label="Room base" value={pkr(calc.roomBase)} />
              <Line label="Extra person" value={pkr(calc.extraCost)} />
              <Line label="Hotel total" value={pkr(calc.hotelCost)} bold />
              <Line label="Guide" value={pkr(calc.guideCost)} />
              <Line label="Flight" value={pkr(calc.flightCost)} />
            </Breakdown>
          </div>

          <Breakdown title="Final">
            <Line label="Subtotal" value={pkr(calc.subtotal)} />
            <Line label={`Profit ${trip.profitPercentage}%`} value={pkr(calc.profit)} />
            <Line label="Grand total" value={pkr(calc.total)} bold />
          </Breakdown>
        </section>
      </div>
    </div>
  );
}

// ---- subcomponents ----

function LabelledInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
}) {
  return (
    <label className="block text-sm">
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <input
        type={type}
        className="mt-1 w-full rounded px-2 py-2 text-sm"
        style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function CellInput({ value, onChange, type = "number" }: { value: string | number; onChange: (v: string) => void; type?: "text" | "number" }) {
  return (
    <input
      type={type}
      className="w-full rounded px-2 py-1.5 text-sm"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label
      className="flex items-center gap-2 rounded px-3 py-2 text-sm cursor-pointer"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function ResultCard({ label, value, primary = false }: { label: string; value: string; primary?: boolean }) {
  return (
    <div
      className="rounded-md p-3"
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}
    >
      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>{label}</div>
      <div className={primary ? "mt-1 text-xl font-bold" : "mt-1 text-base font-semibold"} style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function Warning({ text }: { text: string }) {
  return (
    <div className="rounded-md px-3 py-2 text-sm" style={{ background: "var(--accent-warning-bg, rgba(255,180,0,.1))", color: "var(--accent-warning)", border: "1px solid var(--accent-warning)" }}>
      {text}
    </div>
  );
}

function Breakdown({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md p-3" style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
      <div className="text-sm font-semibold mb-2" style={{ color: "var(--text-primary)" }}>{title}</div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Line({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between gap-3 text-sm ${bold ? "pt-1.5 font-semibold" : ""}`}
      style={bold ? { borderTop: "1px solid var(--border-default)" } : undefined}
    >
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}
