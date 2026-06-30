import { SITE_CONFIG } from "@/lib/constants";

interface TrustStripProps {
  variant?: "row" | "grid";
  showSecurePayment?: boolean;
}

export function TrustStrip({ variant = "row", showSecurePayment = false }: TrustStripProps) {
  const items = [
    {
      icon: <StarFill />,
      label: `${SITE_CONFIG.stats.rating}★ · ${SITE_CONFIG.stats.reviewCount.toLocaleString()}+ reviews`,
    },
    { icon: <Award />, label: "TripAdvisor Travelers' Choice 2025" },
    { icon: <Headset />, label: "24/7 WhatsApp support" },
  ];
  if (showSecurePayment) items.push({ icon: <Lock />, label: "Secure booking" });

  if (variant === "grid") {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-3 rounded-[var(--radius-sm)] bg-[var(--bg-subtle)] border border-[var(--border-default)]"
          >
            <span className="text-[var(--primary)] shrink-0">{item.icon}</span>
            <span className="text-[12px] font-medium text-[var(--text-primary)] leading-tight">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-[var(--text-secondary)]">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span className="text-[var(--primary)]">{item.icon}</span>
          <span className="font-medium">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

function StarFill() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function Award() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="7" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

function Headset() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 18v-6a9 9 0 0118 0v6" />
      <path d="M21 19a2 2 0 01-2 2h-1v-6h3zM3 19a2 2 0 002 2h1v-6H3z" />
    </svg>
  );
}

function Lock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
