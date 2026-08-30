"use client";

import { useState, useTransition } from "react";
import { BlockEditor } from "./tour-editor/BlockEditor";
import type { TourBlock } from "@/types/tour-block";

interface Props {
  destinationSlug: string;
  initialBlocks: TourBlock[];
  saveAction: (
    slug: string,
    blocks: TourBlock[],
  ) => Promise<{ ok: boolean; error?: string }>;
}

export function DestinationBodyEditor({ destinationSlug, initialBlocks, saveAction }: Props) {
  const [blocks, setBlocks] = useState<TourBlock[]>(initialBlocks);
  const [flash, setFlash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(blocks) !== JSON.stringify(initialBlocks);

  function save() {
    startTransition(async () => {
      setError(null);
      const r = await saveAction(destinationSlug, blocks);
      if (r.ok) {
        setFlash("Saved");
        setTimeout(() => setFlash(null), 2000);
      } else {
        setError(r.error ?? "Failed");
      }
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-[var(--text-primary)]">Guide content</h2>
        <div className="flex items-center gap-3">
          {flash && <span className="text-[12px] text-[var(--success)]">{flash}</span>}
          {error && <span className="text-[12px] text-[var(--error)]">{error}</span>}
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="h-9 px-4 text-[13px] font-semibold rounded bg-[var(--primary)] text-[var(--on-primary)] disabled:opacity-40"
          >
            {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </button>
        </div>
      </div>
      <p className="text-[12px] text-[var(--text-tertiary)]">
        Long-form guide shown on the destination page between the hero and the child destinations rail.
        Same block types as tour and package bodies.
      </p>
      <BlockEditor
        tourSlug={destinationSlug}
        blocks={blocks}
        onChange={setBlocks}
        mediaHint={`destinations/${destinationSlug}/`}
        showCityFilter={false}
      />
    </section>
  );
}
