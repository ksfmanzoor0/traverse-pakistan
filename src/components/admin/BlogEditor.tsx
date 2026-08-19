"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BlogPostRow, BlogSectionJson } from "@/lib/supabase/types";
import {
  updateBlogPost,
  setBlogPublished,
  deleteBlogPost,
  type BlogPatch,
} from "@/app/admin/blog/actions";
import { BlogSectionsEditor } from "./BlogSectionsEditor";

type Tab = "basics" | "seo" | "sections" | "preview";

export function BlogEditor({ post }: { post: BlogPostRow }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("basics");
  const [state, setState] = useState(post);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  function patch<K extends keyof BlogPostRow>(key: K, value: BlogPostRow[K]) {
    setState((s) => ({ ...s, [key]: value }));
    setDirty(true);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const body: BlogPatch = {
        title: state.title,
        excerpt: state.excerpt,
        image: state.image,
        tag: state.tag,
        tags: state.tags,
        categories: state.categories,
        author: state.author,
        read_time: state.read_time,
        destination_slug: state.destination_slug,
        meta_title: state.meta_title,
        meta_description: state.meta_description,
        sections: state.sections,
      };
      const res = await updateBlogPost(post.slug, body);
      if (!res.ok) return setError(res.error);
      setDirty(false);
      setSavedAt(new Date());
      router.refresh();
    });
  }

  function togglePublished() {
    startTransition(async () => {
      const res = await setBlogPublished(post.slug, !state.published);
      if (!res.ok) return setError(res.error);
      setState((s) => ({ ...s, published: !s.published }));
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteBlogPost(post.slug);
      if (!res.ok) return setError(res.error);
      router.push("/admin/blog");
    });
  }

  function selectTab(next: Tab) {
    if (dirty && !confirm("You have unsaved changes. Switch tabs and lose them?")) return;
    setTab(next);
  }

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            {state.title || "Untitled"}
          </h1>
          <p className="mt-1 text-xs font-mono" style={{ color: "var(--text-tertiary)" }}>
            /blog/{state.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: state.published ? "var(--primary-muted)" : "var(--bg-subtle)",
              color: state.published ? "var(--primary)" : "var(--text-tertiary)",
            }}
          >
            {state.published ? "Published" : "Draft"}
          </span>
          <button
            type="button"
            onClick={togglePublished}
            disabled={pending}
            className="h-9 px-3 rounded text-xs font-semibold disabled:opacity-50"
            style={{
              background: state.published ? "var(--bg-subtle)" : "var(--primary)",
              color: state.published ? "var(--text-secondary)" : "var(--text-inverse)",
              border: state.published ? "1px solid var(--border-default)" : "none",
            }}
          >
            {state.published ? "Unpublish" : "Publish"}
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="h-9 px-3 rounded text-xs font-semibold disabled:opacity-50"
            style={{
              background: "transparent",
              color: "var(--error)",
              border: "1px solid var(--border-default)",
            }}
          >
            Delete
          </button>
        </div>
      </div>

      <div
        className="mt-6 flex gap-1 border-b"
        style={{ borderColor: "var(--border-default)" }}
      >
        {(["basics", "seo", "sections", "preview"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => selectTab(t)}
            className="px-4 py-2 text-sm font-semibold border-b-2"
            style={{
              color: tab === t ? "var(--primary)" : "var(--text-secondary)",
              borderColor: tab === t ? "var(--primary)" : "transparent",
              background: "transparent",
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "basics" && <BasicsTab state={state} patch={patch} />}
        {tab === "seo" && <SeoTab state={state} patch={patch} />}
        {tab === "sections" && (
          <BlogSectionsEditor
            slug={post.slug}
            value={state.sections}
            onChange={(next: BlogSectionJson[]) => patch("sections", next)}
          />
        )}
        {tab === "preview" && (
          <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Open{" "}
            <a
              href={`/blog/${state.slug}`}
              target="_blank"
              rel="noreferrer"
              className="font-semibold hover:underline"
              style={{ color: "var(--primary)" }}
            >
              /blog/{state.slug}
            </a>{" "}
            in a new tab.
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-4 text-xs px-3 py-2 rounded"
          style={{ background: "var(--error)/10", color: "var(--error)" }}
        >
          {error}
        </div>
      )}

      {tab !== "preview" && (
        <div
          className="mt-6 pt-4 flex items-center justify-between gap-3 border-t"
          style={{ borderColor: "var(--border-default)" }}
        >
          <div className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            {dirty
              ? "Unsaved changes"
              : savedAt
                ? `Saved at ${savedAt.toLocaleTimeString()}`
                : "No changes"}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || pending}
            className="h-10 px-5 rounded font-semibold text-sm disabled:opacity-50"
            style={{
              background: "var(--primary)",
              color: "var(--text-inverse)",
            }}
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tabs ────────────────────────────────────────────────────────────────────

function Field({
  label,
  children,
  note,
}: {
  label: string;
  children: React.ReactNode;
  note?: string;
}) {
  return (
    <div>
      <label
        className="block text-xs font-semibold mb-1"
        style={{ color: "var(--text-secondary)" }}
      >
        {label}
      </label>
      {children}
      {note && (
        <p className="mt-1 text-[11px]" style={{ color: "var(--text-tertiary)" }}>
          {note}
        </p>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-primary)",
  border: "1px solid var(--border-default)",
  color: "var(--text-primary)",
};

function ChipsInput({
  value,
  onChange,
  placeholder,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 rounded min-h-[42px]"
      style={inputStyle}
    >
      {value.map((v, i) => (
        <span
          key={`${v}-${i}`}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
          style={{ background: "var(--primary-muted)", color: "var(--primary)" }}
        >
          {v}
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="ml-1 font-bold"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === ",") && draft.trim()) {
            e.preventDefault();
            const v = draft.trim();
            if (!value.includes(v)) onChange([...value, v]);
            setDraft("");
          } else if (e.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        placeholder={placeholder ?? "Type and press Enter"}
        className="flex-1 min-w-[100px] outline-none text-sm bg-transparent"
        style={{ color: "var(--text-primary)" }}
      />
    </div>
  );
}

function CoverImageInput({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFile(file: File) {
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/admin/blog/${slug}/images`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Upload failed (${res.status})`);
      }
      const { url } = (await res.json()) as { url: string };
      onChange(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste URL or click Upload"
          className="flex-1 h-10 px-3 rounded text-sm"
          style={inputStyle}
        />
        <label
          className="h-10 px-3 rounded text-sm font-semibold cursor-pointer inline-flex items-center whitespace-nowrap"
          style={{
            background: uploading ? "var(--bg-subtle)" : "var(--primary)",
            color: uploading ? "var(--text-tertiary)" : "var(--text-inverse)",
          }}
        >
          {uploading ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {error && (
        <div className="text-xs" style={{ color: "var(--error)" }}>
          {error}
        </div>
      )}
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="Cover preview"
          className="max-h-40 rounded object-cover"
          style={{ border: "1px solid var(--border-default)" }}
        />
      )}
    </div>
  );
}

function BasicsTab({
  state,
  patch,
}: {
  state: BlogPostRow;
  patch: <K extends keyof BlogPostRow>(k: K, v: BlogPostRow[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Field label="Title">
        <input
          value={state.title}
          onChange={(e) => patch("title", e.target.value)}
          className="w-full h-10 px-3 rounded text-sm"
          style={inputStyle}
        />
      </Field>
      <Field
        label="Excerpt"
        note="Rendered as the lead paragraph on the post page and inside social share cards."
      >
        <textarea
          value={state.excerpt}
          onChange={(e) => patch("excerpt", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded text-sm"
          style={inputStyle}
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Cover image" note="Upload or paste a URL. Uploads land in R2.">
          <CoverImageInput
            slug={state.slug}
            value={state.image}
            onChange={(url) => patch("image", url)}
          />
        </Field>
        <Field label="Read time">
          <input
            value={state.read_time}
            onChange={(e) => patch("read_time", e.target.value)}
            placeholder="e.g. 3 min read"
            className="w-full h-10 px-3 rounded text-sm"
            style={inputStyle}
          />
        </Field>
        <Field label="Author">
          <input
            value={state.author}
            onChange={(e) => patch("author", e.target.value)}
            className="w-full h-10 px-3 rounded text-sm"
            style={inputStyle}
          />
        </Field>
        <Field
          label="Destination slug"
          note="Optional link to a destination page (e.g. hunza, skardu). Used for related-posts."
        >
          <input
            value={state.destination_slug ?? ""}
            onChange={(e) => patch("destination_slug", e.target.value || null)}
            placeholder="hunza"
            className="w-full h-10 px-3 rounded text-sm font-mono"
            style={inputStyle}
          />
        </Field>
      </div>
      <Field
        label="Primary tag"
        note="Shown as a coloured chip above the title."
      >
        <input
          value={state.tag}
          onChange={(e) => patch("tag", e.target.value)}
          className="w-full h-10 px-3 rounded text-sm"
          style={inputStyle}
        />
      </Field>
      <Field label="Tags" note="Press Enter or comma to add.">
        <ChipsInput
          value={state.tags}
          onChange={(v) => patch("tags", v)}
          placeholder="Add a tag…"
        />
      </Field>
      <Field label="Categories" note="Press Enter or comma to add.">
        <ChipsInput
          value={state.categories}
          onChange={(v) => patch("categories", v)}
          placeholder="Add a category…"
        />
      </Field>
    </div>
  );
}

function SeoTab({
  state,
  patch,
}: {
  state: BlogPostRow;
  patch: <K extends keyof BlogPostRow>(k: K, v: BlogPostRow[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Field
        label="Meta title"
        note={`${state.meta_title.length} chars · Aim for 50–60 chars.`}
      >
        <input
          value={state.meta_title}
          onChange={(e) => patch("meta_title", e.target.value)}
          className="w-full h-10 px-3 rounded text-sm"
          style={inputStyle}
        />
      </Field>
      <Field
        label="Meta description"
        note={`${state.meta_description.length} chars · Aim for 150–160 chars.`}
      >
        <textarea
          value={state.meta_description}
          onChange={(e) => patch("meta_description", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 rounded text-sm"
          style={inputStyle}
        />
      </Field>
    </div>
  );
}
