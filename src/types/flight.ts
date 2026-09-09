export type AirportCode = string;
export type FlightAirline = "PIA" | "AirBlue" | "AirSial" | "Flyjinnah" | "Unknown";
export type FlightRouteType = "ONEWAY" | "RETURN";
export type FlightSource = "aeroglobe" | "manual";

export interface FlightRouteRow {
  id: string;
  origin: AirportCode;
  destination: AirportCode;
  airline: FlightAirline | string;
  flightNumbers: string[] | null;
  routeType: FlightRouteType;
  departDate: string;          // YYYY-MM-DD
  returnDate: string | null;
  fareTotal: number;
  baseFare: number | null;
  tax: number | null;
  rbd: string | null;
  isRefundable: boolean | null;
  currency: string;
  source: FlightSource | string;
  sourceUrl: string | null;
  notes: string | null;
  scrapedAt: string;            // ISO timestamp
}
