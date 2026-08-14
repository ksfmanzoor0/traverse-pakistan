"use client";

import { useSharedDepartureCity } from "@/hooks/useSharedDepartureCity";
import type { TourListItem } from "@/types/tour";

const CITY_TO_HOME: Record<"islamabad" | "lahore" | "karachi" | "skardu", "ISB" | "LHE" | "KHI" | "KDU"> = {
  islamabad: "ISB", lahore: "LHE", karachi: "KHI", skardu: "KDU",
};

interface Props {
  inclusions: TourListItem[];
  exclusions: TourListItem[];
  tourSlug: string;
  initialDeparture: "islamabad" | "lahore" | "karachi" | "skardu";
}

function filterForCity(items: TourListItem[], home: "ISB" | "LHE" | "KHI" | "KDU"): TourListItem[] {
  return items.filter((i) => !i.cityOnly || i.cityOnly.length === 0 || i.cityOnly.includes(home));
}

export function InclusionsExclusions({ inclusions, exclusions, tourSlug, initialDeparture }: Props) {
  const [departure] = useSharedDepartureCity(initialDeparture, tourSlug);
  const home = CITY_TO_HOME[departure];
  const inc = filterForCity(inclusions, home);
  const exc = filterForCity(exclusions, home);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
      <div>
        <h3 className="text-[14px] font-bold uppercase tracking-wider text-[var(--primary)] mb-3">
          Included
        </h3>
        <ul className="space-y-2">
          {inc.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] text-[var(--text-secondary)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" className="shrink-0 mt-0.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {item.text}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="text-[14px] font-bold uppercase tracking-wider text-[var(--warning)] mb-3">
          Not Included
        </h3>
        <ul className="space-y-2">
          {exc.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-[14px] text-[var(--text-secondary)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" className="shrink-0 mt-0.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
