"use client";

import { useState } from "react";

/**
 * Top-right action cluster on the cost calculator page: trigger a full
 * reprice (calls `repriceAllPackages` server-side) or kick off the GitHub-
 * Actions-hosted aeroglobe scraper.
 *
 * Both endpoints are admin-gated server-side.
 */
export function AdminEngineActions() {
  const [repriceState, setRepriceState] = useState<{ kind: "idle" | "loading" | "ok" | "err"; msg?: string }>({ kind: "idle" });
  const [scraperState, setScraperState] = useState<{ kind: "idle" | "loading" | "ok" | "err"; msg?: string }>({ kind: "idle" });

  async function runReprice() {
    setRepriceState({ kind: "loading" });
    try {
      const res = await fetch("/api/admin/reprice", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { processed: number; failures?: unknown[] };
      const failed = body.failures?.length ?? 0;
      setRepriceState({ kind: "ok", msg: `Repriced ${body.processed} packages${failed > 0 ? ` (${failed} failed)` : ""}.` });
    } catch (err) {
      setRepriceState({ kind: "err", msg: (err as Error).message });
    }
  }

  async function runScraper() {
    setScraperState({ kind: "loading" });
    try {
      const res = await fetch("/api/admin/run-scraper", { method: "POST" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { message?: string };
      setScraperState({ kind: "ok", msg: body.message ?? "Scraper workflow dispatched." });
    } catch (err) {
      setScraperState({ kind: "err", msg: (err as Error).message });
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={runScraper}
          disabled={scraperState.kind === "loading"}
          className="text-xs rounded px-3 py-2 border disabled:opacity-50"
          style={{ borderColor: "var(--border-default)", color: "var(--text-primary)", background: "var(--bg-primary)" }}
          title="Trigger GitHub Actions aeroglobe scraper"
        >
          {scraperState.kind === "loading" ? "Dispatching…" : "Run scraper"}
        </button>
        <button
          type="button"
          onClick={runReprice}
          disabled={repriceState.kind === "loading"}
          className="text-xs rounded px-3 py-2 font-semibold disabled:opacity-50"
          style={{ background: "var(--primary)", color: "var(--on-primary, white)" }}
          title="Re-snapshot every package's engine price into packages.pricing"
        >
          {repriceState.kind === "loading" ? "Repricing…" : "Reprice all packages"}
        </button>
      </div>
      {(repriceState.kind === "ok" || repriceState.kind === "err") && (
        <p className="text-xs" style={{ color: repriceState.kind === "ok" ? "var(--primary)" : "var(--accent-danger)" }}>
          {repriceState.msg}
        </p>
      )}
      {(scraperState.kind === "ok" || scraperState.kind === "err") && (
        <p className="text-xs" style={{ color: scraperState.kind === "ok" ? "var(--primary)" : "var(--accent-danger)" }}>
          {scraperState.msg}
        </p>
      )}
    </div>
  );
}
