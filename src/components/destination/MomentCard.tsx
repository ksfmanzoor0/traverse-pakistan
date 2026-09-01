import { Icon, type IconName } from "@/components/ui/Icon";

interface MomentCardProps {
  icon: IconName;
  title: string;
  description: string;
}

export function MomentCard({ icon, title, description }: MomentCardProps) {
  return (
    <article
      className="group flex gap-4 p-5 sm:p-6 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-default)] hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5"
    >
      <span
        aria-hidden="true"
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-[var(--duration-slow)] ease-[var(--ease-default)] group-hover:scale-[1.06]"
        style={{
          backgroundColor: "var(--bg-elevated)",
          color: "var(--primary)",
          boxShadow: "inset 0 0 0 1px color-mix(in oklab, var(--primary) 30%, transparent)",
        }}
      >
        <Icon name={icon} size="lg" weight="regular" />
      </span>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">
          {title}
        </h3>
        <p className="mt-1 text-[13.5px] text-[var(--text-secondary)] leading-relaxed">
          {description}
        </p>
      </div>
    </article>
  );
}
