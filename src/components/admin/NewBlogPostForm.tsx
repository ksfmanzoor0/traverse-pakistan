"use client";

import { useState, useTransition } from "react";
import { createBlogPost } from "@/app/admin/blog/actions";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function NewBlogPostForm() {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onTitleChange(v: string) {
    setTitle(v);
    if (!slugTouched) setSlug(slugify(v));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await createBlogPost({ title, slug });
      if (res && !res.ok) setError(res.error);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl p-5 space-y-3"
      style={{
        background: "var(--bg-primary)",
        border: "1px solid var(--border-default)",
      }}
    >
      <h2
        className="text-sm font-semibold uppercase tracking-wider"
        style={{ color: "var(--text-tertiary)" }}
      >
        New post
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            className="block text-xs font-semibold mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Title
          </label>
          <input
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            required
            className="w-full h-10 px-3 rounded text-sm"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-semibold mb-1"
            style={{ color: "var(--text-secondary)" }}
          >
            Slug
          </label>
          <input
            value={slug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            required
            pattern="[a-z0-9-]{3,}"
            className="w-full h-10 px-3 rounded text-sm font-mono"
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border-default)",
              color: "var(--text-primary)",
            }}
          />
        </div>
      </div>
      {error && (
        <div
          className="text-xs px-3 py-2 rounded"
          style={{ background: "var(--error)/10", color: "var(--error)" }}
        >
          {error}
        </div>
      )}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending || !title.trim() || !slug.trim()}
          className="h-10 px-4 rounded font-semibold text-sm disabled:opacity-50"
          style={{
            background: "var(--primary)",
            color: "var(--text-inverse)",
          }}
        >
          {pending ? "Creating…" : "Create draft"}
        </button>
      </div>
    </form>
  );
}
