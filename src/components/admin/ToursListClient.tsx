"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type TourRowLite = {
  slug: string;
  name: string;
  destination_slug: string;
  region_slug: string;
  duration: number;
  category: string;
  anchor_city: string | null;
};

interface Props {
  rows: TourRowLite[];
  duplicateAction: (sourceSlug: string, newSlug: string, newName: string) => Promise<{ ok: boolean; slug?: string; error?: string }>;
  deleteAction: (slug: string) => Promise<{ ok: boolean; error?: string }>;
}

export function ToursListClient({ rows, duplicateAction, deleteAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<TourRowLite | null>(null);
  const router = useRouter();

  function onDuplicateClick(row: TourRowLite) {
    setError(null);
    setDuplicating(row);
  }

  function onDelete(row: TourRowLite) {
    setError(null);
    if (!confirm(`Delete "${row.name}"?\nThis removes the tour row + itinerary + addons. Departures (if any) must be cleaned up first from /admin/departures.`)) return;
    startTransition(async () => {
      const r = await deleteAction(row.slug);
      if (!r.ok) setError(r.error ?? "Delete failed");
      else router.refresh();
    });
  }

  return (
    <>
      {error && (
        <div className="p-3 rounded bg-[var(--error)]/10 text-[var(--error)] text-[13px]">{error}</div>
      )}

      <div className="border border-[var(--border-default)] rounded-[var(--radius-md)] bg-[var(--bg-primary)] overflow-hidden">
        <table className="w-full text-left text-[13px]">
          <thead className="bg-[var(--bg-subtle)] text-[var(--text-secondary)] uppercase tracking-wide text-[11px]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Tour</th>
              <th className="px-4 py-2.5 font-semibold">Region</th>
              <th className="px-4 py-2.5 font-semibold">Days</th>
              <th className="px-4 py-2.5 font-semibold">Category</th>
              <th className="px-4 py-2.5 font-semibold">Anchor</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-t border-[var(--border-default)]">
                <td className="px-4 py-2.5">
                  <Link href={`/admin/tours/${r.slug}`} className="font-semibold text-[var(--text-primary)] hover:underline">
                    {r.name}
                  </Link>
                  <div className="text-[11px] text-[var(--text-tertiary)]">{r.slug}</div>
                </td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.region_slug}</td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.duration}</td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.category}</td>
                <td className="px-4 py-2.5 text-[var(--text-secondary)]">{r.anchor_city ?? "—"}</td>
                <td className="px-4 py-2.5 text-right space-x-3 whitespace-nowrap">
                  <Link href={`/admin/tours/${r.slug}`} className="text-[13px] font-semibold text-[var(--primary)] hover:underline">
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDuplicateClick(r)}
                    className="text-[13px] font-semibold text-[var(--text-secondary)] hover:underline"
                  >
                    Duplicate
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => onDelete(r)}
                    className="text-[13px] font-semibold text-[var(--error)] hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {duplicating && (
        <DuplicateModal
          source={duplicating}
          onClose={() => setDuplicating(null)}
          onConfirm={(newSlug, newName) => {
            startTransition(async () => {
              const r = await duplicateAction(duplicating.slug, newSlug, newName);
              if (r.ok && r.slug) {
                router.push(`/admin/tours/${r.slug}`);
              } else {
                setError(r.error ?? "Duplicate failed");
                setDuplicating(null);
              }
            });
          }}
          pending={pending}
        />
      )}
    </>
  );
}

function DuplicateModal({
  source,
  onClose,
  onConfirm,
  pending,
}: {
  source: TourRowLite;
  onClose: () => void;
  onConfirm: (newSlug: string, newName: string) => void;
  pending: boolean;
}) {
  const [newName, setNewName] = useState(`${source.name} (Copy)`);
  const [newSlug, setNewSlug] = useState(`${source.slug}-copy`);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[var(--bg-primary)] rounded-[var(--radius-md)] p-6 w-full max-w-md space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Duplicate tour</h2>
        <p className="text-[13px] text-[var(--text-secondary)]">
          Copies everything from <strong>{source.name}</strong> — content, itinerary days, addons. Departures are not copied.
        </p>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">New name</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full h-10 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[13px] bg-[var(--bg-primary)]" />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-1">New slug</span>
          <input value={newSlug} onChange={(e) => setNewSlug(e.target.value)} className="w-full h-10 px-3 border border-[var(--border-default)] rounded-[var(--radius-sm)] text-[13px] bg-[var(--bg-primary)]" />
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="h-9 px-4 text-[13px] font-semibold text-[var(--text-secondary)] rounded hover:bg-[var(--bg-subtle)]">
            Cancel
          </button>
          <button
            type="button"
            disabled={pending || !newName || !newSlug}
            onClick={() => onConfirm(newSlug, newName)}
            className="h-9 px-4 text-[13px] font-semibold bg-[var(--primary)] text-[var(--text-inverse)] rounded-[var(--radius-sm)] disabled:opacity-60"
          >
            {pending ? "Duplicating…" : "Duplicate"}
          </button>
        </div>
      </div>
    </div>
  );
}
