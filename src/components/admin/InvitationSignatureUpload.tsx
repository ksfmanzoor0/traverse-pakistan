"use client";

import { useState, useTransition } from "react";

type Props = {
  currentDataUrl: string | null;
  saveAction: (dataUrl: string | null) => Promise<{ ok: boolean; error?: string }>;
};

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function InvitationSignatureUpload({ currentDataUrl, saveAction }: Props) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(currentDataUrl);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpe?g)$/.test(file.type)) {
      setMsg("Please select a PNG or JPG image.");
      return;
    }
    if (file.size > 1_800_000) {
      setMsg("Image is too large. Please pick a file under 1.8 MB.");
      return;
    }
    setMsg(null);
    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    startTransition(async () => {
      const res = await saveAction(dataUrl);
      setMsg(res.ok ? "Signature saved." : res.error ?? "Save failed");
      setTimeout(() => setMsg(null), 3000);
    });
  }

  function onClear() {
    if (!confirm("Remove the stored signature? The dashed placeholder will show again.")) return;
    setPreview(null);
    startTransition(async () => {
      const res = await saveAction(null);
      setMsg(res.ok ? "Signature removed." : res.error ?? "Remove failed");
      setTimeout(() => setMsg(null), 3000);
    });
  }

  return (
    <div className="p-4 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-subtle)]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[220px]">
          <p className="text-[13px] font-semibold text-[var(--text-secondary)] mb-1">Signature image</p>
          <p className="text-[12px] text-[var(--text-tertiary)]">
            Used in the letter preview + PDF above the signature line. Transparent-background PNG recommended, ≤ 1.8 MB.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <label className="inline-flex items-center h-9 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[13px] font-semibold text-[var(--text-primary)] cursor-pointer">
              <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={onFile} disabled={pending} />
              {preview ? "Replace signature" : "Upload signature"}
            </label>
            {preview && (
              <button type="button" onClick={onClear} disabled={pending} className="text-[13px] text-[var(--error)]">
                Remove
              </button>
            )}
            {msg && <span className="text-[12px] text-[var(--text-secondary)]">{msg}</span>}
          </div>
        </div>
        <div className="w-64 h-16 border border-dashed border-[var(--border-default)] rounded flex items-center justify-center bg-[var(--bg-primary)]">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Current signature" className="max-h-14 max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-[var(--text-tertiary)]">No signature uploaded</span>
          )}
        </div>
      </div>
    </div>
  );
}
