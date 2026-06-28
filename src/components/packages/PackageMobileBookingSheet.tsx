"use client";

import { useEffect } from "react";
import { PackageBookingSidebar } from "@/components/packages/PackageBookingSidebar";
import type { Package, PackageTier } from "@/types/package";

interface PackageMobileBookingSheetProps {
  open: boolean;
  onClose: () => void;
  pkg: Package;
  selectedTier: PackageTier;
  onTierChange: (tier: PackageTier) => void;
  departureCity: "islamabad" | "lahore" | "karachi";
  onDepartureCityChange: (city: "islamabad" | "lahore" | "karachi") => void;
}

export function PackageMobileBookingSheet({
  open,
  onClose,
  pkg,
  selectedTier,
  onTierChange,
  departureCity,
  onDepartureCityChange,
}: PackageMobileBookingSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="Book this package"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full sm:max-w-[520px] h-[96vh] sm:h-[90vh] sm:max-h-[860px] bg-[var(--bg-primary)] rounded-t-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        <header className="shrink-0 border-b border-[var(--border-default)] px-5 py-3 flex items-center justify-between bg-[var(--bg-primary)]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--primary)]">Book your package</p>
            <p className="text-[14px] font-bold text-[var(--text-primary)] truncate max-w-[260px]">{pkg.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 pb-20">
          <PackageBookingSidebar
            pkg={pkg}
            selectedTier={selectedTier}
            onTierChange={onTierChange}
            departureCity={departureCity}
            onDepartureCityChange={onDepartureCityChange}
          />
        </div>
      </div>
    </div>
  );
}
