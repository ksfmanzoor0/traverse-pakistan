"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

interface InitialFilters {
  origin?: string;
  destination?: string;
  routeType?: string;
  airline?: string;
  source?: string;
  from?: string;
  to?: string;
}

const AIRLINES = ["", "PIA", "AirBlue", "AirSial", "Flyjinnah"];
const AIRPORTS = ["", "KHI", "LHE", "ISB", "KDU", "GIL", "GWD"];

export function FlightFaresFilters({ initial }: { initial: InitialFilters }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [origin, setOrigin] = useState(initial.origin ?? "");
  const [destination, setDestination] = useState(initial.destination ?? "");
  const [routeType, setRouteType] = useState(initial.routeType ?? "");
  const [airline, setAirline] = useState(initial.airline ?? "");
  const [source, setSource] = useState(initial.source ?? "");
  const [from, setFrom] = useState(initial.from ?? "");
  const [to, setTo] = useState(initial.to ?? "");

  function apply() {
    const next = new URLSearchParams(params.toString());
    setOrSkip(next, "origin", origin);
    setOrSkip(next, "destination", destination);
    setOrSkip(next, "routeType", routeType);
    setOrSkip(next, "airline", airline);
    setOrSkip(next, "source", source);
    setOrSkip(next, "from", from);
    setOrSkip(next, "to", to);
    startTransition(() => {
      router.push(`/admin/flight-fares?${next.toString()}`);
    });
  }

  function reset() {
    startTransition(() => {
      router.push("/admin/flight-fares");
    });
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Select label="Origin" value={origin} onChange={setOrigin} options={AIRPORTS} />
        <Select label="Destination" value={destination} onChange={setDestination} options={AIRPORTS} />
        <Select label="Type" value={routeType} onChange={setRouteType} options={["", "ONEWAY", "RETURN"]} />
        <Select label="Airline" value={airline} onChange={setAirline} options={AIRLINES} />
        <Select label="Source" value={source} onChange={setSource} options={["", "aeroglobe", "manual"]} />
        <DateInput label="Depart from" value={from} onChange={setFrom} />
        <DateInput label="Depart to" value={to} onChange={setTo} />
      </div>
      <div className="mt-3 flex gap-2 justify-end">
        <button
          type="button"
          onClick={reset}
          className="px-3 py-2 text-sm rounded-lg"
          style={{
            color: "var(--text-secondary)",
            border: "1px solid var(--border-default)",
          }}
        >
          Reset
        </button>
        <button
          type="button"
          onClick={apply}
          disabled={pending}
          className="px-4 py-2 text-sm rounded-lg font-medium"
          style={{
            background: "var(--primary)",
            color: "var(--on-primary)",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Applying…" : "Apply filters"}
        </button>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-2 text-sm rounded-lg"
        style={{
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || "Any"}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
      <span>{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-2 text-sm rounded-lg"
        style={{
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
        }}
      />
    </label>
  );
}

function setOrSkip(p: URLSearchParams, key: string, value: string) {
  if (value && value !== "") p.set(key, value);
  else p.delete(key);
}
