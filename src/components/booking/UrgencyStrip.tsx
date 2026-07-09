"use client";

import { useEffect, useState } from "react";
import type { UrgencySignals } from "./urgency";

interface UrgencyStripProps {
  signals: UrgencySignals;
  compact?: boolean;
}

export function UrgencyStrip({ signals, compact }: UrgencyStripProps) {
  const { seatsLeft, daysUntilDeparture, viewersNow, isLastMinute, isAlmostFull } = signals;

  const [liveViewers, setLiveViewers] = useState(viewersNow);
  useEffect(() => {
    const id = window.setInterval(() => {
      setLiveViewers((v) => Math.max(2, v + (Math.random() > 0.5 ? 1 : -1)));
    }, 18000);
    return () => window.clearInterval(id);
  }, []);

  const items: { icon: React.ReactNode; label: string; tone: "urgent" | "warm" | "info" }[] = [];

  // Always show a fixed "5 seats left" urgency signal — actual seat counts
  // (including 0 / oversold states) are never surfaced to the customer.
  items.push({
    tone: "urgent",
    icon: <Dot className="animate-pulse" color="var(--error)" />,
    label: "Only 10 seats left",
  });

  if (isLastMinute && daysUntilDeparture !== null && daysUntilDeparture > 0) {
    items.push({
      tone: "warm",
      icon: <ClockIcon />,
      label: `Departs in ${daysUntilDeparture} day${daysUntilDeparture !== 1 ? "s" : ""}`,
    });
  }

  items.push({
    tone: "info",
    icon: <EyeIcon />,
    label: `${liveViewers} people viewing now`,
  });

  if (items.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${
        compact ? "text-[11px]" : "text-[12px]"
      } font-medium`}
    >
      {items.map((item, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5"
          style={{
            color:
              item.tone === "urgent"
                ? "var(--error)"
                : item.tone === "warm"
                  ? "var(--accent-warm)"
                  : "var(--text-secondary)",
          }}
        >
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  );
}

function Dot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${className ?? ""}`}
      style={{ backgroundColor: color }}
    />
  );
}

function ClockIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
