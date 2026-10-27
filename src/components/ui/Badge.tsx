import { cn } from "@/lib/utils";
import type { BadgeType } from "@/types/tour";

interface BadgeProps {
  type: BadgeType;
  className?: string;
}

const badgeConfig: Record<
  NonNullable<BadgeType>,
  { label: string; className: string }
> = {
  "on-sale": {
    label: "ON SALE",
    className: "bg-[var(--warning)] text-[var(--text-inverse)]",
  },
  "epic-trek": {
    label: "EPIC TREK",
    className: "bg-[var(--primary)] text-[var(--text-inverse)]",
  },
  bestseller: {
    label: "BESTSELLER",
    className: "bg-[var(--accent-warm)] text-[var(--text-inverse)]",
  },
  new: {
    label: "NEW",
    className: "bg-[var(--info)] text-[var(--text-inverse)]",
  },
};

export function Badge({ type, className }: BadgeProps) {
  if (!type) return null;
  // An unknown badge value (e.g. legacy data from before the enum was
  // narrowed) would otherwise crash SSR with "Cannot read properties of
  // undefined (reading 'className')" and take down every page that
  // renders this component. Soft-fail to null instead.
  const config = badgeConfig[type];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] rounded-[var(--radius-full)]",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
