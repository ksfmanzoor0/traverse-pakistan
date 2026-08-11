// Discriminated addon config union — one variant per tour_addons.type.
// The resolver in addon-cost.service.ts dispatches by `type` and reads
// the matching config shape below. Adding a new type = add a variant here
// + a case in the resolver.

import type { FlightRouteType } from "@/types/flight";

export type AddonType =
  | "flight"
  | "bus"
  | "hotel"
  | "meal"
  | "activity"
  | "transfer"
  | "insurance"
  | "custom";

export interface FlightLegConfig {
  from: string;
  to: string;
  routeType: FlightRouteType;
  day: number | "last";
  farePerPerson?: number;
  carrier?: string;
}

export interface FlightConfig {
  legs: FlightLegConfig[];
}

export interface BusConfig {
  legs: FlightLegConfig[];
}

export interface HotelConfig {
  nights: number;
  farePerPerson: number;
  hotelSlug?: string;
  roomType?: string;
}

export interface MealConfig {
  meals: number;
  farePerPerson: number;
  description?: string;
}

export interface UnitConfig {
  farePerPerson: number;
  quantity?: number;
  unit?: string;
}

export type AddonConfigByType = {
  flight: FlightConfig;
  bus: BusConfig;
  hotel: HotelConfig;
  meal: MealConfig;
  activity: UnitConfig;
  transfer: UnitConfig;
  insurance: UnitConfig;
  custom: UnitConfig;
};

// Small JSON-safe view shipped to the client on the Tour object.
// Drives sidebar rendering without a fetch.
export interface ResolvedAddonView {
  id: string;
  type: AddonType;
  label: string;
  perPerson: number;
  isRequired: boolean;
  defaultSelected: boolean;
  groupKey: string | null;
  durationDelta: number;
}
