import { listHeroSlides } from "./actions";
import { HeroSlidesManager } from "@/components/admin/HeroSlidesManager";

export const dynamic = "force-dynamic";

export default async function AdminHeroSlidesPage() {
  const res = await listHeroSlides();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Homepage hero slider</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Images that rotate in the full-width hero on the homepage. Reorder with the arrows, toggle
          publish to hide a slide temporarily, delete to remove it from the site and from R2.
        </p>
      </div>

      {!res.ok && (
        <div
          className="rounded-[var(--radius-md)] border p-4 text-sm"
          style={{
            borderColor: "var(--error)",
            background: "color-mix(in srgb, var(--error) 8%, transparent)",
            color: "var(--error)",
          }}
        >
          Failed to load slides: {res.error}
        </div>
      )}

      <HeroSlidesManager initialRows={res.rows ?? []} />
    </div>
  );
}
