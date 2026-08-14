"use client";

import Image from "next/image";
import { useSharedDepartureCity } from "@/hooks/useSharedDepartureCity";
import type { TourBlock } from "@/types/tour-block";

const CITY_TO_HOME: Record<"islamabad" | "lahore" | "karachi" | "skardu", "ISB" | "LHE" | "KHI" | "KDU"> = {
  islamabad: "ISB", lahore: "LHE", karachi: "KHI", skardu: "KDU",
};

interface Props {
  blocks: TourBlock[];
  tourSlug: string;
  initialDeparture?: "islamabad" | "lahore" | "karachi" | "skardu";
}

// Renders the tour body block-list. Blocks with cityOnly hide themselves
// unless the traveler's home city is in the list — same bus as the
// itinerary + inclusions filters.
export function TourBody({ blocks, tourSlug, initialDeparture = "islamabad" }: Props) {
  const [departure] = useSharedDepartureCity(initialDeparture, tourSlug);
  const home = CITY_TO_HOME[departure];
  const visible = blocks.filter((b) => !b.cityOnly || b.cityOnly.length === 0 || b.cityOnly.includes(home));
  if (visible.length === 0) return null;
  return (
    <div className="space-y-6">
      {visible.map((block) => <BlockRenderer key={block.id} block={block} />)}
    </div>
  );
}

function BlockRenderer({ block }: { block: TourBlock }) {
  switch (block.type) {
    case "heading": {
      if (block.level === 2) {
        return <h2 className="text-xl font-bold text-[var(--text-primary)]">{block.text}</h2>;
      }
      return <h3 className="text-lg font-semibold text-[var(--text-primary)]">{block.text}</h3>;
    }
    case "paragraph":
      return (
        <p className="text-[14px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-line">
          {block.text}
        </p>
      );
    case "list": {
      const Tag = block.ordered ? "ol" : "ul";
      return (
        <Tag className={`space-y-1.5 text-[14px] text-[var(--text-secondary)] ${block.ordered ? "list-decimal" : "list-disc"} pl-5`}>
          {block.items.map((it, i) => <li key={i}>{it}</li>)}
        </Tag>
      );
    }
    case "image":
      return (
        <figure className="space-y-2">
          <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-[var(--bg-subtle)]">
            <Image src={block.url} alt={block.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 800px" />
          </div>
          {block.caption && (
            <figcaption className="text-[12px] text-[var(--text-tertiary)] italic">{block.caption}</figcaption>
          )}
        </figure>
      );
    case "callout": {
      const styles: Record<typeof block.variant, { bg: string; border: string; fg: string; icon: string }> = {
        info:    { bg: "var(--info-light, var(--bg-subtle))", border: "var(--info, var(--primary))", fg: "var(--info-deep, var(--primary-deep))", icon: "ⓘ" },
        warning: { bg: "var(--warning-light, var(--bg-subtle))", border: "var(--warning)", fg: "var(--warning)", icon: "!" },
        tip:     { bg: "var(--accent-warm-light, var(--bg-subtle))", border: "var(--accent-warm, var(--primary))", fg: "var(--accent-warm, var(--primary-deep))", icon: "★" },
      };
      const s = styles[block.variant];
      return (
        <div
          className="flex gap-3 p-4 rounded-lg border"
          style={{ background: s.bg, borderColor: `${s.border}33` }}
        >
          <span aria-hidden className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold" style={{ background: s.border, color: "var(--text-inverse)" }}>
            {s.icon}
          </span>
          <p className="text-[14px] leading-relaxed" style={{ color: s.fg }}>{block.text}</p>
        </div>
      );
    }
    case "embed": {
      const aspect = block.aspect === "16/9" ? "aspect-[16/9]" : block.aspect === "4/3" ? "aspect-[4/3]" : "aspect-square";
      return (
        <div className={`${aspect} rounded-lg overflow-hidden bg-[var(--bg-subtle)]`}>
          <iframe
            src={toEmbedUrl(block.url)}
            title="Embedded content"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      );
    }
    case "divider":
      return <hr className="border-[var(--border-default)]" />;
  }
}

// Normalize YouTube watch/short URLs to /embed/. Maps embed URLs pass through.
function toEmbedUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") && u.searchParams.get("v")) {
      return `https://www.youtube.com/embed/${u.searchParams.get("v")}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    return url;
  } catch {
    return url;
  }
}
