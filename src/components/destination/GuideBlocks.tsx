import { BlockRenderer } from "@/components/ui/BlockList";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { TourBlock, HeadingBlock } from "@/types/tour-block";

// Groups the flat block list into h2 sections. Each h2 becomes a section
// header; the blocks that follow are split further by h3 into MomentCard-
// style items in a 2-column grid. Sections without h3 render as a single
// full-width card. Each card carries a per-icon pastel tint that matches
// the season-token palette so it stays visible in both light and dark modes.

interface Subsection {
  h3Title: string | null;
  blocks: TourBlock[];
}
interface Section {
  h2Title: string;
  icon: IconName;
  subsections: Subsection[];
}

// Returns null on no-match so callers can fall back to the parent-section
// icon (place-name cards like "Baltit and Altit Forts" inherit the h2 icon).
function pickIcon(title: string): IconName | null {
  const t = title.toLowerCase();
  if (t.includes("air") || t.includes("flight") || t.includes("fly")) return "airplane";
  if (t.includes("road") || t.includes("drive") || t.includes("highway") || t.includes("bus")) return "car";
  if (t.includes("stay") || t.includes("hotel") || t.includes("accommodat")) return "house";
  if (t.includes("food") || t.includes("eat") || t.includes("cuisine") || t.includes("culture")) return "fork-knife";
  if (t.includes("do") || t.includes("explore") || t.includes("see") || t.includes("visit")) return "list-checks";
  if (t.includes("when") || t.includes("season") || t.includes("time")) return "calendar-check";
  if (t.includes("get") || t.includes("reach") || t.includes("route")) return "map-pin";
  return null;
}

function sectionIcon(h2Title: string): IconName {
  return pickIcon(h2Title) ?? "sun-horizon";
}

// Reuses the season token palette so dark-mode variants already exist.
const iconTint: Record<IconName, { bg: string; fg: string; ring: string }> = {
  airplane:        { bg: "var(--season-winter-bg)", fg: "var(--season-winter-fg)", ring: "var(--season-winter-ring)" },
  car:             { bg: "var(--season-spring-bg)", fg: "var(--season-spring-fg)", ring: "var(--season-spring-ring)" },
  house:           { bg: "var(--season-summer-bg)", fg: "var(--season-summer-fg)", ring: "var(--season-summer-ring)" },
  "fork-knife":    { bg: "var(--season-autumn-bg)", fg: "var(--season-autumn-fg)", ring: "var(--season-autumn-ring)" },
  "list-checks":   { bg: "var(--season-summer-bg)", fg: "var(--season-summer-fg)", ring: "var(--season-summer-ring)" },
  "calendar-check":{ bg: "var(--season-autumn-bg)", fg: "var(--season-autumn-fg)", ring: "var(--season-autumn-ring)" },
  "map-pin":       { bg: "var(--season-winter-bg)", fg: "var(--season-winter-fg)", ring: "var(--season-winter-ring)" },
  "sun-horizon":   { bg: "var(--season-autumn-bg)", fg: "var(--season-autumn-fg)", ring: "var(--season-autumn-ring)" },
} as unknown as Record<IconName, { bg: string; fg: string; ring: string }>;

function tintFor(icon: IconName) {
  return iconTint[icon] ?? { bg: "var(--season-autumn-bg)", fg: "var(--season-autumn-fg)", ring: "var(--season-autumn-ring)" };
}

function parseSections(blocks: TourBlock[]): Section[] {
  const sections: Section[] = [];
  let currentSection: Section | null = null;
  let currentSub: Subsection | null = null;

  const flushSub = () => {
    if (currentSection && currentSub && (currentSub.h3Title || currentSub.blocks.length > 0)) {
      currentSection.subsections.push(currentSub);
    }
    currentSub = null;
  };

  for (const block of blocks) {
    if (block.type === "heading" && (block as HeadingBlock).level === 2) {
      flushSub();
      if (currentSection) sections.push(currentSection);
      const title = (block as HeadingBlock).text;
      currentSection = { h2Title: title, icon: sectionIcon(title), subsections: [] };
      currentSub = null;
      continue;
    }
    if (block.type === "heading" && (block as HeadingBlock).level === 3) {
      flushSub();
      if (!currentSection) {
        currentSection = { h2Title: "", icon: "sun-horizon", subsections: [] };
      }
      currentSub = { h3Title: (block as HeadingBlock).text, blocks: [] };
      continue;
    }
    if (!currentSection) {
      currentSection = { h2Title: "", icon: "sun-horizon", subsections: [] };
    }
    if (!currentSub) currentSub = { h3Title: null, blocks: [] };
    currentSub.blocks.push(block);
  }
  flushSub();
  if (currentSection) sections.push(currentSection);
  return sections;
}

export function GuideBlocks({ blocks }: { blocks: TourBlock[] }) {
  if (blocks.length === 0) return null;
  const sections = parseSections(blocks);

  return (
    <div className="space-y-14">
      {sections.map((section, i) => {
        const hasH3 = section.subsections.some((s) => s.h3Title);
        return (
          <div key={i}>
            {section.h2Title && (
              <h2 className="text-[24px] sm:text-[28px] font-bold tracking-[-0.02em] text-[var(--text-primary)] mb-6">
                {section.h2Title}
              </h2>
            )}
            {hasH3 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {section.subsections.map((sub, j) => {
                  const icon = (sub.h3Title && pickIcon(sub.h3Title)) || section.icon;
                  return (
                    <GuideCard key={j} icon={icon} title={sub.h3Title} blocks={sub.blocks} />
                  );
                })}
              </div>
            ) : (
              <GuideCard
                icon={section.icon}
                title={null}
                blocks={section.subsections.flatMap((s) => s.blocks)}
                stretched
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function GuideCard({
  icon,
  title,
  blocks,
  stretched = false,
}: {
  icon: IconName;
  title: string | null;
  blocks: TourBlock[];
  stretched?: boolean;
}) {
  const tint = tintFor(icon);
  return (
    <article
      className={`group flex gap-4 p-5 sm:p-6 rounded-[var(--radius-md)] border transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-default)] hover:shadow-[var(--shadow-md)] ${stretched ? "" : "hover:-translate-y-0.5"}`}
      style={{ backgroundColor: tint.bg, borderColor: tint.ring }}
    >
      <span
        aria-hidden="true"
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-transform duration-[var(--duration-slow)] ease-[var(--ease-default)] group-hover:scale-[1.06]"
        style={{
          backgroundColor: "var(--bg-elevated)",
          color: tint.fg,
          boxShadow: `inset 0 0 0 1px ${tint.ring}`,
        }}
      >
        <Icon name={icon} size="lg" weight="regular" />
      </span>
      <div className="min-w-0 space-y-3 flex-1">
        {title && (
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-tight">{title}</h3>
        )}
        {blocks.map((block) => (
          <BlockRenderer key={block.id} block={block} />
        ))}
      </div>
    </article>
  );
}
