"use client";

import { useState } from "react";
import { CityChips } from "./CityChips";
import { BLOCK_TYPE_LABELS, makeBlock, type TourBlock, type TourBlockType } from "@/types/tour-block";

type Home = "ISB" | "LHE" | "KHI" | "KDU";

interface Props {
  tourSlug: string;
  blocks: TourBlock[];
  onChange: (next: TourBlock[]) => void;
}

// Ordered list editor for TourBlock[]. Each block gets a type-specific form
// (BlockFields) plus a shared city-visibility chip picker + reorder buttons.
export function BlockEditor({ tourSlug, blocks, onChange }: Props) {
  const [addOpen, setAddOpen] = useState(false);

  function updateAt(i: number, patch: Partial<TourBlock>) {
    onChange(blocks.map((b, idx) => (idx === i ? ({ ...b, ...patch } as TourBlock) : b)));
  }
  function removeAt(i: number) {
    if (!confirm("Delete this block?")) return;
    onChange(blocks.filter((_, idx) => idx !== i));
  }
  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= blocks.length) return;
    const next = blocks.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function duplicate(i: number) {
    const clone = { ...blocks[i], id: crypto.randomUUID() } as TourBlock;
    const next = blocks.slice();
    next.splice(i + 1, 0, clone);
    onChange(next);
  }
  function addOfType(type: TourBlockType) {
    setAddOpen(false);
    onChange([...blocks, makeBlock(type)]);
  }

  return (
    <div className="space-y-3">
      {blocks.length === 0 && (
        <div className="p-6 text-center border border-dashed border-[var(--border-default)] rounded-[var(--radius-sm)] text-[13px] text-[var(--text-tertiary)]">
          No content blocks yet. Click <em>+ Add block</em> to start.
        </div>
      )}

      {blocks.map((block, i) => (
        <div key={block.id} className="border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
              {BLOCK_TYPE_LABELS[block.type]}
            </span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="w-7 h-7 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-subtle)] disabled:opacity-30" aria-label="Move up">↑</button>
              <button type="button" onClick={() => move(i, +1)} disabled={i === blocks.length - 1} className="w-7 h-7 rounded text-[var(--text-tertiary)] hover:bg-[var(--bg-subtle)] disabled:opacity-30" aria-label="Move down">↓</button>
              <button type="button" onClick={() => duplicate(i)} className="h-7 px-2 text-[11px] font-semibold text-[var(--text-secondary)] rounded hover:bg-[var(--bg-subtle)]">Duplicate</button>
              <button type="button" onClick={() => removeAt(i)} className="h-7 px-2 text-[11px] font-semibold text-[var(--error)] rounded hover:bg-[var(--bg-subtle)]">Delete</button>
            </div>
          </div>

          <BlockFields tourSlug={tourSlug} block={block} onChange={(patch) => updateAt(i, patch)} />

          <div className="pt-2 border-t border-[var(--border-default)]">
            <CityChips
              label="Visible for:"
              value={block.cityOnly as Home[] | undefined}
              onChange={(next) => updateAt(i, { cityOnly: next } as Partial<TourBlock>)}
            />
          </div>
        </div>
      ))}

      <div className="relative">
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="h-9 px-3 text-[12px] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)]/40 rounded-[var(--radius-sm)] hover:bg-[var(--bg-subtle)]"
        >
          + Add block
        </button>
        {addOpen && (
          <div className="absolute z-10 mt-1 border border-[var(--border-default)] bg-[var(--bg-primary)] rounded-[var(--radius-sm)] shadow-lg py-1 min-w-[220px]">
            {(Object.keys(BLOCK_TYPE_LABELS) as TourBlockType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => addOfType(t)}
                className="w-full text-left px-3 py-1.5 text-[13px] hover:bg-[var(--bg-subtle)]"
              >
                {BLOCK_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================ Per-type fields ============================ */

function BlockFields({
  tourSlug,
  block,
  onChange,
}: {
  tourSlug: string;
  block: TourBlock;
  onChange: (patch: Partial<TourBlock>) => void;
}) {
  switch (block.type) {
    case "heading":
      return (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {[2, 3].map((lvl) => (
              <button
                key={lvl}
                type="button"
                onClick={() => onChange({ level: lvl as 2 | 3 } as Partial<TourBlock>)}
                className={block.level === lvl ? chipActive : chip}
              >
                H{lvl}
              </button>
            ))}
          </div>
          <input
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value } as Partial<TourBlock>)}
            placeholder="Heading text"
            className={inputCls}
          />
        </div>
      );
    case "paragraph":
      return (
        <textarea
          value={block.text}
          onChange={(e) => onChange({ text: e.target.value } as Partial<TourBlock>)}
          placeholder="Paragraph text"
          rows={3}
          className={`${inputCls} resize-y`}
        />
      );
    case "list": {
      const items = block.items;
      const setItem = (idx: number, v: string) => {
        const next = items.slice();
        next[idx] = v;
        onChange({ items: next } as Partial<TourBlock>);
      };
      return (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            <button type="button" onClick={() => onChange({ ordered: false } as Partial<TourBlock>)} className={!block.ordered ? chipActive : chip}>
              Bulleted
            </button>
            <button type="button" onClick={() => onChange({ ordered: true } as Partial<TourBlock>)} className={block.ordered ? chipActive : chip}>
              Numbered
            </button>
          </div>
          {items.map((it, idx) => (
            <div key={idx} className="flex gap-2">
              <input value={it} onChange={(e) => setItem(idx, e.target.value)} className={inputCls} />
              <button
                type="button"
                onClick={() => onChange({ items: items.filter((_, x) => x !== idx) } as Partial<TourBlock>)}
                className="h-9 px-2 text-[12px] text-[var(--error)] rounded hover:bg-[var(--bg-subtle)]"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => onChange({ items: [...items, ""] } as Partial<TourBlock>)}
            className="h-8 px-2.5 text-[11px] font-semibold text-[var(--primary)] border border-dashed border-[var(--primary)]/40 rounded"
          >
            + Add item
          </button>
        </div>
      );
    }
    case "image":
      return (
        <div className="space-y-2">
          <input
            value={block.url}
            onChange={(e) => onChange({ url: e.target.value } as Partial<TourBlock>)}
            placeholder="Image URL (paste an existing URL — for uploads use the Gallery tab)"
            className={inputCls}
          />
          <input
            value={block.alt}
            onChange={(e) => onChange({ alt: e.target.value } as Partial<TourBlock>)}
            placeholder="Alt text"
            className={inputCls}
          />
          <input
            value={block.caption ?? ""}
            onChange={(e) => onChange({ caption: e.target.value || undefined } as Partial<TourBlock>)}
            placeholder="Caption (optional)"
            className={inputCls}
          />
          <p className="text-[11px] text-[var(--text-tertiary)]">
            Upload files from the Gallery tab first (they land in <code>tours/{tourSlug}/</code>), then paste the URL here.
          </p>
        </div>
      );
    case "callout":
      return (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {(["info", "warning", "tip"] as const).map((v) => (
              <button key={v} type="button" onClick={() => onChange({ variant: v } as Partial<TourBlock>)} className={block.variant === v ? chipActive : chip}>
                {v}
              </button>
            ))}
          </div>
          <textarea
            value={block.text}
            onChange={(e) => onChange({ text: e.target.value } as Partial<TourBlock>)}
            rows={2}
            className={`${inputCls} resize-y`}
          />
        </div>
      );
    case "embed":
      return (
        <div className="space-y-2">
          <input
            value={block.url}
            onChange={(e) => onChange({ url: e.target.value } as Partial<TourBlock>)}
            placeholder="YouTube video URL or Google Maps embed URL"
            className={inputCls}
          />
          <div className="flex gap-1.5">
            {(["16/9", "4/3", "1/1"] as const).map((a) => (
              <button key={a} type="button" onClick={() => onChange({ aspect: a } as Partial<TourBlock>)} className={block.aspect === a ? chipActive : chip}>
                {a}
              </button>
            ))}
          </div>
        </div>
      );
    case "divider":
      return <div className="text-[12px] text-[var(--text-tertiary)]">Renders as a horizontal rule.</div>;
  }
}

const inputCls = "w-full h-9 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[13px]";
const chip = "h-7 px-2.5 rounded-full text-[11px] font-semibold border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--primary)]";
const chipActive = "h-7 px-2.5 rounded-full text-[11px] font-semibold border border-[var(--primary)] bg-[var(--primary)] text-[var(--text-inverse)]";
