import { BlockRenderer } from "@/components/ui/BlockList";
import type { TourBlock, HeadingBlock } from "@/types/tour-block";

// Groups the flat block-list into "sections" — each h2 starts a new card,
// all subsequent non-h2 blocks belong to that card. Renders each card in
// the elevated-surface style used by MomentCard so the guide reads as
// discrete topics instead of one long text wall. Blocks that appear before
// the first h2 render in an "intro" card.
export function GuideBlocks({ blocks }: { blocks: TourBlock[] }) {
  if (blocks.length === 0) return null;

  const groups: { title: string | null; children: TourBlock[] }[] = [];
  let current: { title: string | null; children: TourBlock[] } = { title: null, children: [] };
  for (const block of blocks) {
    if (block.type === "heading" && (block as HeadingBlock).level === 2) {
      if (current.children.length > 0 || current.title !== null) groups.push(current);
      current = { title: (block as HeadingBlock).text, children: [] };
    } else {
      current.children.push(block);
    }
  }
  if (current.children.length > 0 || current.title !== null) groups.push(current);

  return (
    <div className="space-y-5">
      {groups.map((group, i) => (
        <article
          key={i}
          className="rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] p-6 sm:p-8 transition-[border-color,box-shadow] duration-[var(--duration-normal)] ease-[var(--ease-default)] hover:border-[var(--primary)]/30 hover:shadow-[var(--shadow-sm)]"
        >
          {group.title && (
            <h2 className="text-[22px] sm:text-[24px] font-bold tracking-[-0.02em] text-[var(--text-primary)] mb-5">
              {group.title}
            </h2>
          )}
          <div className="space-y-5">
            {group.children.map((block) => (
              <BlockRenderer key={block.id} block={block} />
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
