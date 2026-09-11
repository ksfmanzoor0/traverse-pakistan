"use client";

import { useState } from "react";
import type { EngineConfig } from "@/services/vehicle.service";

interface Props {
  initial: EngineConfig;
  overriddenPackageCount: number;
}

type Msg = { kind: "ok" | "err"; text: string } | null;

export function EngineSettingsForm({ initial, overriddenPackageCount }: Props) {
  const [values, setValues] = useState<EngineConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);
  const [overrideCount, setOverrideCount] = useState(overriddenPackageCount);

  const dirty =
    values.fuelPricePerLitre !== initial.fuelPricePerLitre ||
    values.profitPercentage !== initial.profitPercentage ||
    values.packageBufferKm !== initial.packageBufferKm ||
    values.lheExtensionKm !== initial.lheExtensionKm ||
    values.guidePerDay !== initial.guidePerDay;

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/engine-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setMsg({
        kind: "ok",
        text: `Saved. Repriced ${json.reprice.processed} packages (${json.reprice.failures} failed). Packages with overrides keep their pinned values.`,
      });
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function resetOverrides() {
    if (!confirm(`Clear fuel / profit / guide overrides on ${overrideCount} package(s) so they inherit the new global defaults? This cannot be undone — operators would need to re-pin per-package values manually.`)) return;
    setResetting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/engine-settings/reset-overrides", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setOverrideCount(0);
      setMsg({
        kind: "ok",
        text: `Cleared overrides on ${json.cleared} packages. Repriced ${json.reprice.processed} (${json.reprice.failures} failed).`,
      });
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setResetting(false);
    }
  }

  const inputCls = "h-9 w-full rounded-md border px-3 text-sm";
  const inputStyle = { background: "var(--bg-primary)", borderColor: "var(--border-default)", color: "var(--text-primary)" };

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Fuel / litre (PKR)" value={values.fuelPricePerLitre} onChange={(n) => setValues((v) => ({ ...v, fuelPricePerLitre: n }))} inputCls={inputCls} inputStyle={inputStyle} />
        <Field label="Profit %" value={values.profitPercentage} onChange={(n) => setValues((v) => ({ ...v, profitPercentage: n }))} inputCls={inputCls} inputStyle={inputStyle} />
        <Field label="Guide / day (PKR)" value={values.guidePerDay} onChange={(n) => setValues((v) => ({ ...v, guidePerDay: n }))} inputCls={inputCls} inputStyle={inputStyle} />
        <Field label="Package buffer km" value={values.packageBufferKm} onChange={(n) => setValues((v) => ({ ...v, packageBufferKm: n }))} inputCls={inputCls} inputStyle={inputStyle} />
        <Field label="LHE extension km" value={values.lheExtensionKm} onChange={(n) => setValues((v) => ({ ...v, lheExtensionKm: n }))} inputCls={inputCls} inputStyle={inputStyle} />
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-3" style={{ borderTop: "1px solid var(--border-default)" }}>
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving || resetting}
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          {saving ? "Saving & repricing…" : dirty ? "Save & reprice all" : "Saved"}
        </button>
        <button
          type="button"
          onClick={resetOverrides}
          disabled={overrideCount === 0 || saving || resetting}
          className="rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", color: "var(--text-secondary)" }}
        >
          {resetting ? "Clearing…" : overrideCount === 0 ? "No package overrides" : `Reset overrides on ${overrideCount} package${overrideCount === 1 ? "" : "s"}`}
        </button>
      </div>

      {msg && (
        <div
          className="rounded-md px-3 py-2 text-sm"
          style={{
            background: msg.kind === "ok" ? "var(--bg-elevated)" : "rgba(220, 38, 38, 0.08)",
            border: `1px solid ${msg.kind === "ok" ? "var(--border-default)" : "rgba(220, 38, 38, 0.3)"}`,
            color: msg.kind === "ok" ? "var(--text-secondary)" : "#b91c1c",
          }}
        >
          {msg.text}
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, onChange, inputCls, inputStyle,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  inputCls: string;
  inputStyle: React.CSSProperties;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputCls}
        style={inputStyle}
      />
    </label>
  );
}
