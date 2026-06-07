"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InlineAlert } from "@/components/ui/InlineAlert";

interface Props {
  initialName: string;
  username: string | null;
  email: string | null;
}

export function SettingsForm({ initialName, username, email }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    if (name.trim() === initialName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save name");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-[480px]">
      <div>
        <label className="block text-[12px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-1.5">
          Display name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          className="w-full h-11 px-4 border border-[var(--border-default)] rounded-[var(--radius-sm)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-[14px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/50 focus:border-[var(--primary)] transition-colors"
        />
        <p className="mt-1.5 text-[12px] text-[var(--text-tertiary)]">
          This is how we&apos;ll greet you across the site.
        </p>
      </div>

      {(username || email) && (
        <div className="text-[12px] text-[var(--text-tertiary)] space-y-1 pt-2">
          {username && (
            <div className="flex items-center gap-2">
              <span className="font-semibold uppercase tracking-wide text-[11px]">Username</span>
              <span className="font-mono">{username}</span>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-2 truncate">
              <span className="font-semibold uppercase tracking-wide text-[11px]">Email</span>
              <span className="truncate">{email}</span>
            </div>
          )}
        </div>
      )}

      {error && <InlineAlert>{error}</InlineAlert>}
      {saved && <InlineAlert variant="success">Name updated.</InlineAlert>}

      <button
        type="submit"
        disabled={saving || name.trim() === initialName.trim() || !name.trim()}
        className="h-11 px-6 bg-[var(--primary)] text-[var(--text-inverse)] text-[14px] font-semibold rounded-[var(--radius-sm)] hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
