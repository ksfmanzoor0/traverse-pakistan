"use client";

import { useState, useTransition } from "react";

type Props = {
  id: string;
  initial: string | null;
  saveAction: (id: string, code: string) => Promise<{ ok: boolean; error?: string }>;
};

export function HotelReservationCodeEditor({ id, initial, saveAction }: Props) {
  const [value, setValue] = useState<string>(initial ?? "");
  const [savedValue, setSavedValue] = useState<string>(initial ?? "");
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const dirty = value.trim() !== savedValue.trim();

  function onSave() {
    setMsg(null);
    setErr(null);
    startTransition(async () => {
      const res = await saveAction(id, value);
      if (res.ok) {
        setSavedValue(value);
        setMsg("Saved");
      } else {
        setErr(res.error ?? "Save failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setMsg(null);
        }}
        placeholder="Enter hotel's reservation code"
        className="h-9 px-3 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-primary)] text-[14px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] font-mono min-w-[220px]"
      />
      <button
        type="button"
        onClick={onSave}
        disabled={pending || !dirty}
        className="h-9 px-3 rounded-[var(--radius-sm)] bg-[var(--primary)] text-[var(--on-primary,white)] text-[12px] font-semibold disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {msg && <span className="text-[12px] text-[var(--success)]">{msg}</span>}
      {err && <span className="text-[12px] text-[var(--error)]">{err}</span>}
    </div>
  );
}
