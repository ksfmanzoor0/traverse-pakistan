"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";

export function SaveButton({ label = "Save" }: { label?: string }) {
  const { pending } = useFormStatus();
  const [justSaved, setJustSaved] = useState(false);
  const [wasPending, setWasPending] = useState(false);

  useEffect(() => {
    if (pending) {
      setWasPending(true);
      setJustSaved(false);
    } else if (wasPending) {
      setWasPending(false);
      setJustSaved(true);
      const t = setTimeout(() => setJustSaved(false), 1800);
      return () => clearTimeout(t);
    }
  }, [pending, wasPending]);

  const text = pending ? "Saving…" : justSaved ? "Saved ✓" : label;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded px-4 py-1.5 text-sm font-medium text-white ${
        justSaved ? "bg-emerald-600" : "bg-emerald-700 hover:bg-emerald-800"
      } disabled:opacity-70`}
    >
      {text}
    </button>
  );
}
