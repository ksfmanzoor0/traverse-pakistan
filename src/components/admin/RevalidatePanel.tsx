"use client";

import { useState } from "react";

interface Item {
  slug: string;
  name: string;
}

interface Props {
  title: string;
  endpoint: string;
  listingPath: string;
  pathPrefix: string;
  items: Item[];
}

type Status = { kind: "idle" } | { kind: "loading" } | { kind: "ok"; msg: string } | { kind: "err"; msg: string };

export function RevalidatePanel({ title, endpoint, listingPath, pathPrefix, items }: Props) {
  const [slug, setSlug] = useState(items[0]?.slug ?? "");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function call(path?: string) {
    setStatus({ kind: "loading" });
    try {
      const url = path ? `${endpoint}?path=${encodeURIComponent(path)}` : endpoint;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setStatus({ kind: "ok", msg: path ? `Refreshed ${path}` : `Refreshed listing` });
    } catch (err) {
      setStatus({ kind: "err", msg: err instanceof Error ? err.message : "Failed" });
    }
  }

  const busy = status.kind === "loading";

  return (
    <section
      className="rounded-2xl border p-5"
      style={{ borderColor: "var(--border-default)", background: "var(--bg-elevated)" }}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {items.length} items
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => call()}
          disabled={busy}
          className="px-3 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50"
          style={{
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)",
            background: "var(--bg-subtle)",
          }}
        >
          Refresh listing only ({listingPath})
        </button>
      </div>

      <div
        className="mt-4 pt-4 border-t flex flex-col sm:flex-row gap-3 sm:items-center"
        style={{ borderColor: "var(--border-default)" }}
      >
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          disabled={busy || items.length === 0}
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-sm border outline-none"
          style={{
            borderColor: "var(--border-default)",
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
          }}
        >
          {items.length === 0 && <option>No items</option>}
          {items.map((it) => (
            <option key={it.slug} value={it.slug}>
              {it.name} ({it.slug})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => slug && call(`${pathPrefix}${slug}`)}
          disabled={busy || !slug}
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--on-primary, #fff)",
          }}
        >
          Refresh this page (data + images)
        </button>
      </div>

      {status.kind !== "idle" && (
        <p
          className="mt-3 text-xs"
          style={{
            color:
              status.kind === "ok"
                ? "var(--success, #16a34a)"
                : status.kind === "err"
                ? "var(--error, #dc2626)"
                : "var(--text-tertiary)",
          }}
        >
          {status.kind === "loading" ? "Working…" : status.msg}
        </p>
      )}
    </section>
  );
}
