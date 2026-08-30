import { BlockRenderer } from "@/components/ui/BlockList";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { TourBlock, HeadingBlock } from "@/types/tour-block";

// Groups the flat block list into h2 sections. Each h2 becomes a section
// header; the blocks that follow are split further by h3 into MomentCard-
// style items rendered in a 2-column grid. Sections with no h3 (just
// paragraphs directly under the h2) render as a single full-width card.

interface Subsection {
  h3Title: string | null;
  blocks: TourBlock[];
}
interface Section {
  h2Title: string;
  icon: IconName;
  subsections: Subsection[];
}

function pickIcon(title: string): IconName {
  const t = title.toLowerCase();
  // Order matters: more specific matches (air, road) come before catch-alls
  // (get, reach) so a card titled "By air via Gilgit" picks airplane, not
  // the parent-section fallback that would match "get to Hunza".
  if (t.includes("air") || t.includes("flight") || t.includes("fly")) return "airplane";
  if (t.includes("road") || t.includes("drive") || t.includes("highway") || t.includes("bus")) return "car";
  if (t.includes("stay") || t.includes("hotel") || t.includes("accommodat")) return "house";
  if (t.includes("food") || t.includes("eat") || t.includes("cuisine") || t.includes("culture")) return "fork-knife";
  if (t.includes("do") || t.includes("explore") || t.includes("see") || t.includes("visit")) return "list-checks";
  if (t.includes("when") || t.includes("season") || t.includes("time")) return "calendar-check";
  if (t.includes("get") || t.includes("reach") || t.includes("route")) return "map-pin";
  return "sun-horizon";
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
      currentSection = { h2Title: title, icon: pickIcon(title), subsections: [] };
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
        // If any subsection has an h3 title, use the grid layout; otherwise
        // render the whole section as a single card (avoids the awkward "one
        // giant column card" for short prose sections like Where-to-stay).
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
                {section.subsections.map((sub, j) => (
                  <GuideCard
                    key={j}
                    icon={sub.h3Title ? pickIcon(sub.h3Title) : section.icon}
                    title={sub.h3Title}
                    blocks={sub.blocks}
                  />
                ))}
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
  return (
    <article
      className={`group flex gap-4 p-5 sm:p-6 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] transition-[border-color,box-shadow,transform] duration-[var(--duration-normal)] ease-[var(--ease-default)] hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-md)] ${stretched ? "" : "hover:-translate-y-0.5"}`}
    >
      <span
        aria-hidden="true"
        className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center bg-[var(--primary-light)] text-[var(--primary-deep)] ring-1 ring-[var(--primary)]/15 transition-transform duration-[var(--duration-slow)] ease-[var(--ease-default)] group-hover:scale-[1.06]"
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
