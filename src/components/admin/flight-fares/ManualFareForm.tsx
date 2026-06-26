"use client";

import { useState, useTransition } from "react";
import { saveManualOverride } from "@/app/admin/flight-fares/actions";

const AIRLINES = ["PIA", "AirBlue", "AirSial", "Flyjinnah"];
const AIRPORTS = ["KHI", "LHE", "ISB", "KDU", "GIL", "GWD"];

export function ManualFareForm() {
  const [open, setOpen] = useState(false);
  const [routeType, setRouteType] = useState<"ONEWAY" | "RETURN">("ONEWAY");
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            border: "1px solid var(--border-default)",
            color: "var(--text-primary)",
            background: "var(--bg-elevated)",
          }}
        >
          + Add manual fare override
        </button>
      </div>
    );
  }

  async function onSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveManualOverride(formData);
      if (result.ok) {
        setFeedback({ kind: "ok", msg: "Saved. Manual override now wins for this route+date." });
      } else {
        setFeedback({ kind: "err", msg: result.error });
      }
    });
  }

  return (
    <form
      action={onSubmit}
      className="rounded-xl p-4 space-y-4"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--primary)",
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Manual fare override
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Wins over scraped Aeroglobe value for the same (route, type, depart, return).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setFeedback(null);
          }}
          className="text-xs"
          style={{ color: "var(--text-tertiary)" }}
        >
          Cancel
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Field label="Origin">
          <select name="origin" required defaultValue="" className="form-select">
            <option value="" disabled>Select…</option>
            {AIRPORTS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Destination">
          <select name="destination" required defaultValue="" className="form-select">
            <option value="" disabled>Select…</option>
            {AIRPORTS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Airline">
          <select name="airline" required defaultValue="" className="form-select">
            <option value="" disabled>Select…</option>
            {AIRLINES.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </Field>
        <Field label="Type">
          <select
            name="routeType"
            value={routeType}
            onChange={(e) => setRouteType(e.target.value as "ONEWAY" | "RETURN")}
            className="form-select"
          >
            <option value="ONEWAY">ONEWAY</option>
            <option value="RETURN">RETURN</option>
          </select>
        </Field>
        <Field label="Depart date">
          <input type="date" name="departDate" required className="form-input" />
        </Field>
        <Field label={routeType === "RETURN" ? "Return date" : "Return (n/a)"}>
          <input
            type="date"
            name="returnDate"
            required={routeType === "RETURN"}
            disabled={routeType === "ONEWAY"}
            className="form-input"
          />
        </Field>
        <Field label="Fare total (PKR)">
          <input type="number" name="fareTotal" min={1} step={1} required className="form-input" placeholder="e.g. 54534" />
        </Field>
        <Field label="Notes (optional)" className="col-span-2 md:col-span-4 lg:col-span-5">
          <input type="text" name="notes" maxLength={200} className="form-input" placeholder="Why this override? Source quote, agent confirmation…" />
        </Field>
      </div>

      {feedback && (
        <div
          className="text-sm rounded-lg px-3 py-2"
          style={{
            background: feedback.kind === "ok" ? "var(--primary-muted)" : "rgba(185,28,28,0.08)",
            color: feedback.kind === "ok" ? "var(--primary)" : "var(--danger, #b91c1c)",
          }}
        >
          {feedback.msg}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded-lg text-sm font-medium"
          style={{
            background: "var(--primary)",
            color: "var(--on-primary)",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Saving…" : "Save override"}
        </button>
      </div>

      <style jsx>{`
        :global(.form-select),
        :global(.form-input) {
          padding: 0.5rem 0.625rem;
          border-radius: 0.5rem;
          background: var(--bg-primary);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
          font-size: 0.875rem;
        }
        :global(.form-input:disabled),
        :global(.form-select:disabled) {
          opacity: 0.5;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex flex-col gap-1 text-xs ${className}`} style={{ color: "var(--text-tertiary)" }}>
      <span>{label}</span>
      {children}
    </label>
  );
}
