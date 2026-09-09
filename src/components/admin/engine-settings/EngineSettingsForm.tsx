"use client";

import { useState } from "react";
import Link from "next/link";
import type { EngineConfig } from "@/services/vehicle.service";
import type { OverriddenPackage } from "@/app/admin/engine-settings/page";

interface Props {
  initial: EngineConfig;
  overriddenPackages: OverriddenPackage[];
}

type Msg = { kind: "ok" | "err"; text: string } | null;

export function EngineSettingsForm({ initial, overriddenPackages }: Props) {
  const [values, setValues] = useState<EngineConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resettingSlug, setResettingSlug] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [pkgs, setPkgs] = useState<OverriddenPackage[]>(overriddenPackages);
  const overrideCount = pkgs.length;

  const dirty =
    values.fuelPricePerLitre !== initial.fuelPricePerLitre ||
    values.profitPercentage !== initial.profitPercentage ||
    values.packageBufferKm !== initial.packageBufferKm ||
    values.lheExtensionKm !== initial.lheExtensionKm ||
    values.guidePerDay !== initial.guidePerDay ||
    values.signupCreditPkr !== initial.signupCreditPkr;

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
      setPkgs([]);
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

  async function resetOne(slug: string, name: string) {
    if (!confirm(`Clear fuel / profit / guide overrides on "${name}"? It will inherit the global defaults on the next quote.`)) return;
    setResettingSlug(slug);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/engine-settings/reset-package-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
      setPkgs((cur) => cur.filter((p) => p.slug !== slug));
      setMsg({
        kind: "ok",
        text: `Cleared overrides on "${name}" and repriced (${json.reprice.written} tier/home leaves written).`,
      });
    } catch (err) {
      setMsg({ kind: "err", text: (err as Error).message });
    } finally {
      setResettingSlug(null);
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
        <Field label="Signup credit (PKR)" value={values.signupCreditPkr} onChange={(n) => setValues((v) => ({ ...v, signupCreditPkr: n }))} inputCls={inputCls} inputStyle={inputStyle} />
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

      {pkgs.length > 0 && (
        <div className="pt-4" style={{ borderTop: "1px solid var(--border-default)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-tertiary)" }}>
            Packages with pinned overrides ({pkgs.length})
          </h3>
          <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--border-default)" }}>
            <table className="min-w-full text-sm">
              <thead style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}>
                <tr>
                  <th className="text-left px-3 py-2 font-semibold">Package</th>
                  <th className="text-right px-3 py-2 font-semibold">Fuel</th>
                  <th className="text-right px-3 py-2 font-semibold">Profit %</th>
                  <th className="text-right px-3 py-2 font-semibold">Guide/day</th>
                  <th className="text-right px-3 py-2 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {pkgs.map((p) => (
                  <tr key={p.slug} style={{ borderTop: "1px solid var(--border-default)" }}>
                    <td className="px-3 py-2">
                      <Link
                        href={`/admin/packages/${p.slug}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--primary)" }}
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: p.fuelPricePerLitre !== null ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                      {p.fuelPricePerLitre !== null ? p.fuelPricePerLitre : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: p.profitPercentage !== null ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                      {p.profitPercentage !== null ? p.profitPercentage : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums" style={{ color: p.guidePerDay !== null ? "var(--text-primary)" : "var(--text-tertiary)" }}>
                      {p.guidePerDay !== null ? p.guidePerDay : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => resetOne(p.slug, p.name)}
                        disabled={resettingSlug === p.slug || resetting || saving}
                        className="text-xs font-semibold rounded px-2 py-1 disabled:opacity-60"
                        style={{ color: "#b91c1c", border: "1px solid rgba(220,38,38,0.25)" }}
                      >
                        {resettingSlug === p.slug ? "Clearing…" : "Reset"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
            Click a name to edit its overrides on the package admin. Reset clears fuel / profit / guide only — hotel snapshot, add-ons, and other package attributes are untouched.
          </p>
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
