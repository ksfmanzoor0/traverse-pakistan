import Link from "next/link";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  light?: boolean;
  className?: string;
}

export function Breadcrumb({ items, light, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("hidden md:flex items-center gap-2 text-[13px]", className)}>
      <Link
        href="/"
        className={cn(
          "font-medium transition-colors",
          light ? "text-[var(--on-dark-secondary)] hover:text-[var(--on-dark)]" : "text-[var(--text-tertiary)] hover:text-[var(--primary)]"
        )}
      >
        Home
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className={light ? "text-[var(--on-dark-tertiary)]" : "text-[var(--text-tertiary)]/50"}>
            ›
          </span>
          {item.href ? (
            <Link
              href={item.href}
              className={cn(
                "font-medium transition-colors",
                light ? "text-[var(--on-dark-secondary)] hover:text-[var(--on-dark)]" : "text-[var(--text-tertiary)] hover:text-[var(--primary)]"
              )}
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn("font-medium", light ? "text-[var(--on-dark)]" : "text-[var(--text-primary)]")}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
