"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  // Until mounted, render the static "light" variant so the SSR HTML always
  // matches the first client render. The pre-hydration <script> in
  // <head> sets the real data-theme attribute on <html>, so the CSS picks
  // up the correct colors even while this button is still showing the
  // light-default icon for one frame.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const effectiveTheme = mounted ? theme : "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "relative w-10 h-10 flex items-center justify-center rounded-[var(--radius-sm)]",
        "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]",
        "transition-all duration-200 cursor-pointer",
        className
      )}
      aria-label={`Switch to ${effectiveTheme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${effectiveTheme === "light" ? "dark" : "light"} mode`}
    >
      {/* Sun icon (shown in dark mode) */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "absolute transition-all duration-300",
          effectiveTheme === "dark"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 rotate-90 scale-0"
        )}
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>

      {/* Moon icon (shown in light mode) */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          "absolute transition-all duration-300",
          effectiveTheme === "light"
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-0"
        )}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
