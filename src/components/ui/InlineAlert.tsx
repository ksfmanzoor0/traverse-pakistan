import { Icon } from "./Icon";
import type { IconName } from "./icon-map";

type Variant = "error" | "success";

interface Props {
  variant?: Variant;
  icon?: IconName;
  children: React.ReactNode;
}

const VARIANTS: Record<Variant, { container: string; text: string; icon: IconName; color: string }> = {
  error: {
    container: "bg-[var(--error)]/10 border-[var(--error)]/30",
    text: "text-[var(--error)]",
    icon: "x",
    color: "var(--error)",
  },
  success: {
    container: "bg-[var(--success)]/10 border-[var(--success)]/30",
    text: "text-[var(--success)]",
    icon: "check",
    color: "var(--success)",
  },
};

// Unified inline alert for form errors + action feedback. Replaces ad-hoc
// `<div className="p-3 bg-[var(--error)]/10 …">` blocks scattered across
// booking forms. Pass children as the message; variant controls colors +
// default icon; pass `icon` to override.
export function InlineAlert({ variant = "error", icon, children }: Props) {
  const cfg = VARIANTS[variant];
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-[var(--radius-sm)] border ${cfg.container}`}>
      <Icon name={icon ?? cfg.icon} size="xs" color={cfg.color} className="mt-0.5 shrink-0" />
      <p className={`text-[13px] font-medium leading-snug ${cfg.text}`}>{children}</p>
    </div>
  );
}
