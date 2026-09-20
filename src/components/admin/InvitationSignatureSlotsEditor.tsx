"use client";

import { useState, useTransition } from "react";
import type { SignatureSlot } from "@/lib/invitation/config";

type SavePatch = { dataUrl?: string | null; label?: string | null };

type Props = {
  slots: SignatureSlot[];
  saveAction: (slot: number, patch: SavePatch) => Promise<{ ok: boolean; error?: string }>;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function InvitationSignatureSlotsEditor({ slots, saveAction }: Props) {
  return (
    <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-subtle)]">
      <p className="text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Signature slots</p>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-4">
        Save up to 3 signatures. On each letter you can pick which slot to sign with. Transparent-background PNG recommended, ≤ 1.8 MB.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {slots.map((slot, i) => (
          <SlotCard key={i} index={i} slot={slot} saveAction={saveAction} />
        ))}
      </div>
    </div>
  );
}

function SlotCard({ index, slot, saveAction }: { index: number; slot: SignatureSlot; saveAction: Props["saveAction"] }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(slot.dataUrl);
  const [label, setLabel] = useState<string>(slot.label ?? "");

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 2500);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      flash("PNG or JPG only.");
      return;
    }
    if (file.size > 1_800_000) {
      flash("Under 1.8 MB please.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    startTransition(async () => {
      const res = await saveAction(index, { dataUrl });
      flash(res.ok ? "Saved." : res.error ?? "Save failed");
    });
  }

  function onRemove() {
    if (!confirm(`Remove signature ${index + 1}?`)) return;
    setPreview(null);
    startTransition(async () => {
      const res = await saveAction(index, { dataUrl: null });
      flash(res.ok ? "Removed." : res.error ?? "Remove failed");
    });
  }

  function onLabelBlur() {
    if ((label.trim() || null) === (slot.label ?? null)) return;
    startTransition(async () => {
      const res = await saveAction(index, { label });
      flash(res.ok ? "Label saved." : res.error ?? "Save failed");
    });
  }

  return (
    <div className="p-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-semibold text-[var(--text-secondary)]">Slot {index + 1}</span>
        {preview && (
          <button type="button" onClick={onRemove} disabled={pending} className="text-[11px] text-[var(--error)]">
            Remove
          </button>
        )}
      </div>
      <div className="w-full h-16 border border-dashed border-[var(--border-default)] rounded flex items-center justify-center bg-[var(--bg-subtle)] mb-2">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={`Signature ${index + 1}`} className="max-h-14 max-w-full object-contain" />
        ) : (
          <span className="text-[11px] text-[var(--text-tertiary)]">Empty</span>
        )}
      </div>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onBlur={onLabelBlur}
        placeholder="Label (e.g. name)"
        disabled={pending}
        className="w-full h-8 px-2 mb-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[12px] text-[var(--text-primary)]"
      />
      <label className="inline-flex items-center h-8 px-2 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[12px] font-semibold text-[var(--text-primary)] cursor-pointer">
        <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onFile} disabled={pending} />
        {preview ? "Replace" : "Upload"}
      </label>
      {msg && <p className="mt-1 text-[11px] text-[var(--text-secondary)]">{msg}</p>}
    </div>
  );
}
