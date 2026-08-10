import type { TourImage } from "./tour";

export type DepartureCity = "islamabad" | "lahore" | "karachi" | "skardu";

export interface ItineraryStop {
  name: string;
  detail: string;
  cityOnly?: DepartureCity;
}

export interface ItineraryDay {
  dayNumber: number;
  title: string;
  description: string;
  image: TourImage | null;
  stops: ItineraryStop[];
  drivingTime: string;
  overnight: string;
}

export interface TourItinerary {
  tourSlug: string;
  days: ItineraryDay[];
}
