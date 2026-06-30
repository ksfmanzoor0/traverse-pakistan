"use client";

import { useState, useTransition } from "react";
import { saveScraperConfig } from "@/app/admin/flight-fares/actions";

interface Props {
  initialEmail: string;
  hasPassword: boolean;
  scrapeEnabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

function fmtUpdated(iso: string | null, by: string | null): string {
  if (!iso) return "never";
  const stamp = new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
  return by ? `${stamp} by ${by}` : stamp;
}

export function ScraperConfigPanel({
  initialEmail,
  hasPassword,
  scrapeEnabled,
  updatedAt,
  updatedBy,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveScraperConfig(formData);
      if (result.ok) {
        setFeedback({ kind: "ok", msg: "Scraper config saved. Next scheduled run picks up the new values." });
      } else {
        setFeedback({ kind: "err", msg: result.error });
      }
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            Scraper config
          </h2>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>
            Aeroglobe credentials used by the GitHub Actions scraper. Updated{" "}
            <span style={{ color: "var(--text-secondary)" }}>{fmtUpdated(updatedAt, updatedBy)}</span>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            label={scrapeEnabled ? "Scraping enabled" : "Scraping paused"}
            tone={scrapeEnabled ? "ok" : "warn"}
          />
          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              setFeedback(null);
            }}
            className="text-sm font-medium px-3 py-1.5 rounded-lg"
            style={{
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
              background: "var(--bg-primary)",
            }}
          >
            {open ? "Cancel" : "Edit"}
          </button>
        </div>
      </div>

      {!open && (
        <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <Stat label="Email" value={initialEmail || "—"} />
          <Stat label="Password" value={hasPassword ? "•••••••• (set)" : "(not set)"} />
          <Stat label="Status" value={scrapeEnabled ? "Enabled" : "Paused"} />
        </div>
      )}

      {open && (
        <form action={onSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Field label="Aeroglobe email">
              <input
                type="email"
                name="email"
                required
                defaultValue={initialEmail}
                className="form-input"
                placeholder="traversepakistan@gmail.com"
              />
            </Field>
            <Field
              label={
                <span className="flex items-center justify-between gap-2 text-xs">
                  <span>Aeroglobe password {hasPassword ? "(leave blank to keep current)" : ""}</span>
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="underline"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
              }
            >
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="new-password"
                placeholder={hasPassword ? "•••••••• (unchanged)" : "Set initial password"}
                className="form-input"
              />
            </Field>
          </div>

          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text-primary)" }}>
            <input
              type="checkbox"
              name="scrapeEnabled"
              defaultChecked={scrapeEnabled}
            />
            Scraping enabled (uncheck to pause the cron without disabling the workflow)
          </label>

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

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setFeedback(null);
              }}
              className="px-3 py-2 text-sm rounded-lg"
              style={{
                color: "var(--text-secondary)",
                border: "1px solid var(--border-default)",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="px-4 py-2 text-sm rounded-lg font-medium"
              style={{
                background: "var(--primary)",
                color: "var(--on-primary)",
                opacity: pending ? 0.6 : 1,
              }}
            >
              {pending ? "Saving…" : "Save config"}
            </button>
          </div>

          <style jsx>{`
            :global(.form-input) {
              padding: 0.5rem 0.625rem;
              border-radius: 0.5rem;
              background: var(--bg-primary);
              color: var(--text-primary);
              border: 1px solid var(--border-default);
              font-size: 0.875rem;
              width: 100%;
            }
          `}</style>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
        {label}
      </div>
      <div className="font-medium mt-0.5" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
    </div>
  );
}

function Badge({ label, tone }: { label: string; tone: "ok" | "warn" }) {
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full"
      style={{
        background: tone === "ok" ? "var(--primary-muted)" : "rgba(217, 119, 6, 0.12)",
        color: tone === "ok" ? "var(--primary)" : "#b45309",
      }}
    >
      {label}
    </span>
  );
}
