import { cn } from "@/lib/utils";
import Link from "next/link";
import { EyebrowLabel } from "@/components/ui/EyebrowLabel";

interface SectionHeaderProps {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  linkText?: string;
  linkHref?: string;
  light?: boolean;
  center?: boolean;
  className?: string;
}

export function SectionHeader({
  title,
  eyebrow,
  subtitle,
  linkText,
  linkHref,
  light,
  center,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 mb-10",
        center
          ? "items-center text-center"
          : "sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className={cn(center && "flex flex-col items-center")}>
        {eyebrow && <EyebrowLabel light={light} className="mb-2">{eyebrow}</EyebrowLabel>}
        <h2
          className={cn(
            "text-[26px] font-bold tracking-[-0.025em] leading-[1.15]",
            light ? "text-[var(--on-dark)]" : "text-[var(--text-primary)]"
          )}
          style={{ fontSize: "clamp(1.625rem, 1.4rem + 1.2vw, 2.375rem)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className={cn(
              "mt-1.5 leading-relaxed",
              light ? "text-[var(--on-dark-secondary)]" : "text-[var(--text-secondary)]"
            )}
            style={{ fontSize: "clamp(0.9375rem, 0.875rem + 0.3vw, 1.125rem)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {linkText && linkHref && (
        <Link
          href={linkHref}
          className={cn(
            "group inline-flex items-center gap-1.5 text-[14px] font-semibold shrink-0 mt-2 sm:mt-0 transition-colors duration-[var(--duration-fast)]",
            light
              ? "text-[var(--primary-muted)] hover:text-[var(--on-dark)]"
              : "text-[var(--primary)] hover:text-[var(--primary-hover)]"
          )}
        >
          {linkText}
          <span
            aria-hidden="true"
            className="transition-transform duration-[var(--duration-normal)] ease-[var(--ease-default)] group-hover:translate-x-0.5"
          >
            &rarr;
          </span>
        </Link>
      )}
    </div>
  );
}
