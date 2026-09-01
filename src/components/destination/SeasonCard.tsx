import { Icon, type IconName } from "@/components/ui/Icon";
import type { SeasonInfo } from "@/types/destination";

type Season = SeasonInfo["season"];

const seasonIcon: Record<Season, IconName> = {
  spring: "flower",
  summer: "sun",
  autumn: "leaf",
  winter: "snowflake",
};

const seasonTint: Record<Season, { bg: string; fg: string; ring: string }> = {
  spring: {
    bg: "var(--season-spring-bg)",
    fg: "var(--season-spring-fg)",
    ring: "var(--season-spring-ring)",
  },
  summer: {
    bg: "var(--season-summer-bg)",
    fg: "var(--season-summer-fg)",
    ring: "var(--season-summer-ring)",
  },
  autumn: {
    bg: "var(--season-autumn-bg)",
    fg: "var(--season-autumn-fg)",
    ring: "var(--season-autumn-ring)",
  },
  winter: {
    bg: "var(--season-winter-bg)",
    fg: "var(--season-winter-fg)",
    ring: "var(--season-winter-ring)",
  },
};

const badgeStyles: Record<SeasonInfo["badgeColor"], string> = {
  green: "bg-[var(--primary-light)] text-[var(--primary-deep)]",
  yellow: "bg-[var(--accent-warm-light)] text-[var(--accent-warm)]",
  blue: "bg-[var(--bg-subtle)] text-[var(--info)]",
  red: "bg-[var(--bg-subtle)] text-[var(--error)]",
};

interface SeasonCardProps {
  info: SeasonInfo;
}

export function SeasonCard({ info }: SeasonCardProps) {
  const tint = seasonTint[info.season];
  const iconName = seasonIcon[info.season];

  return (
    <div
      className="group rounded-[var(--radius-md)] p-5 text-center border transition-[box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-default)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
      style={{
        borderColor: tint.ring,
        backgroundColor: tint.bg,
      }}
    >
      <span
        aria-hidden="true"
        className="inline-flex w-12 h-12 rounded-full items-center justify-center transition-transform duration-[600ms] ease-[var(--ease-default)] group-hover:scale-[1.06] group-hover:rotate-[6deg]"
        style={{
          backgroundColor: "var(--bg-elevated)",
          color: tint.fg,
          boxShadow: `inset 0 0 0 1px ${tint.ring}`,
        }}
      >
        <Icon name={iconName} size="xl" weight="regular" />
      </span>
      <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mt-3 capitalize">
        {info.season}
      </h3>
      <p className="text-[12.5px] text-[var(--text-secondary)] mt-0.5">{info.months}</p>
      <span
        className={`inline-block mt-2.5 px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] rounded-full ${badgeStyles[info.badgeColor]}`}
      >
        {info.badge}
      </span>
      <p className="text-[13px] text-[var(--text-secondary)] mt-2.5 leading-relaxed">
        {info.description}
      </p>
    </div>
  );
}
