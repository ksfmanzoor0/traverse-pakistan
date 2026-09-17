"use client";

import { useState } from "react";

interface Props {
  href: string;
  compact?: boolean;
}

/**
 * Clickable + copyable share link for an invitation-letter payment page.
 * Compact variant fits inside the admin list row (icon-only Copy). Full
 * variant renders a labeled URL block for the detail page.
 */
export function InvitationShareLink({ href, compact }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  if (compact) {
    return (
      <div className="inline-flex items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] text-[var(--primary)] hover:underline max-w-[220px] truncate"
        >
          {href.replace(/^https?:\/\//, "")}
        </a>
        <button
          type="button"
          onClick={copy}
          title={copied ? "Copied" : "Copy link"}
          className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
        </button>
        {copied && <span className="text-[11px] text-[var(--success)]">Copied</span>}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-subtle)] p-4">
      <div className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)] mb-2">
        Client payment link
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[14px] font-mono text-[var(--primary)] hover:underline break-all flex-1 min-w-0"
        >
          {href}
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 px-3 h-9 rounded-[var(--radius-sm)] bg-[var(--primary)] text-white text-[13px] font-semibold hover:opacity-90"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
      <p className="text-[12px] text-[var(--text-tertiary)] mt-2">
        Share with the client. They can open it on any device and pay via Alfa — no sign-in required.
      </p>
    </div>
  );
}
