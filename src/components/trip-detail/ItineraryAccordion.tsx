"use client";

import Image from "next/image";
import { AccordionItem } from "@/components/ui/Accordion";
import type { ItineraryDay } from "@/types/itinerary";

interface ItineraryAccordionProps {
  days: ItineraryDay[];
}

function formatDescription(text: string): string[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean);
}

export function ItineraryAccordion({ days }: ItineraryAccordionProps) {
  return (
    <div className="border border-[var(--border-default)] rounded-xl overflow-hidden">
      {days.map((day) => (
        <AccordionItem
          key={day.dayNumber}
          defaultOpen={day.dayNumber === 1}
          title={
            <div className="flex items-center gap-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--text-inverse)] text-[13px] font-bold flex items-center justify-center">
                {day.dayNumber}
              </span>
              <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                {day.title}
              </span>
            </div>
          }
          className="px-5"
        >
          <div className="pl-11">
            {/* Image — only rendered when uploaded */}
            {day.image?.url && (
              <div className="relative h-[200px] rounded-lg overflow-hidden mb-4">
                <Image
                  src={day.image.url}
                  alt={day.image.alt || day.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 500px"
                />
              </div>
            )}

            {/* Description */}
            <div className="text-[14px] text-[var(--text-secondary)] leading-relaxed mb-4 space-y-1">
              {formatDescription(day.description).map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>

            {/* Stops timeline */}
            {day.stops.length > 0 && (
              <div className="relative pl-6 border-l-2 border-[var(--primary)]/20 space-y-4 mb-4">
                {day.stops.map((stop, i) => (
                  <div key={i} className="relative">
                    <div className="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full bg-[var(--primary)] border-2 border-white" />
                    <p className="text-[14px] font-semibold text-[var(--text-primary)]">
                      {stop.name}
                    </p>
                    <p className="text-[13px] text-[var(--text-tertiary)]">
                      {stop.detail}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Meta */}
            <div className="flex flex-wrap gap-4 text-[13px] text-[var(--text-tertiary)]">
              {day.drivingTime && (
                <span className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                  {day.drivingTime}
                </span>
              )}
              {day.overnight && (
                <span className="flex items-center gap-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                  </svg>
                  Overnight: {day.overnight}
                </span>
              )}
            </div>
          </div>
        </AccordionItem>
      ))}
    </div>
  );
}
