"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/quote-requests", label: "Quote Requests" },
  { href: "/admin/tourbookings", label: "Tour Bookings" },
  { href: "/admin/package-bookings", label: "Package Bookings" },
  { href: "/admin/hotel-bookings", label: "Hotel Bookings" },
  { href: "/admin/departures", label: "Departures" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/flight-fares", label: "Flight Fares" },
  { href: "/admin/package-flights", label: "Package Flights" },
  { href: "/admin/cost-calculator", label: "Cost Calculator" },
  { href: "/admin/vehicles", label: "Vehicles" },
  { href: "/admin/engine-settings", label: "Engine Settings" },
  { href: "/admin/revalidate", label: "Cache" },
];

export function AdminSidebar({ email }: { email: string | null }) {
  const pathname = usePathname();

  return (
    <aside
      className="w-64 shrink-0 border-r px-4 py-6 flex flex-col"
      style={{
        borderColor: "var(--border-default)",
        background: "var(--bg-elevated)",
      }}
    >
      <div className="px-3 pb-6">
        <div
          className="text-xs font-semibold tracking-wider uppercase"
          style={{ color: "var(--text-tertiary)" }}
        >
          Admin
        </div>
        <div
          className="text-lg font-semibold mt-1"
          style={{ color: "var(--text-primary)" }}
        >
          Backoffice
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                "hover:bg-[var(--bg-subtle)]"
              )}
              style={{
                color: active ? "var(--primary)" : "var(--text-secondary)",
                background: active ? "var(--primary-muted)" : "transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div
        className="mt-auto pt-6 border-t text-xs"
        style={{
          borderColor: "var(--border-default)",
          color: "var(--text-tertiary)",
        }}
      >
        Signed in as
        <div
          className="text-sm font-medium mt-1 truncate"
          style={{ color: "var(--text-secondary)" }}
        >
          {email ?? "—"}
        </div>
      </div>
    </aside>
  );
}
