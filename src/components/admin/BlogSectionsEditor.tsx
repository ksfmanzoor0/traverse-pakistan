"use client";

import { useState } from "react";
import type { BlogSectionJson } from "@/lib/supabase/types";
import { BlogRichEditor } from "./BlogRichEditor";
import { GalleryEditor } from "./tour-editor/GalleryEditor";

const inputStyle: React.CSSProperties = {
  background: "var(--bg-primary)",
  border: "1px solid var(--border-default)",
  color: "var(--text-primary)",
};

function newSectionId(): string {
  return `s-${Math.random().toString(36).slice(2, 10)}`;
}

export function BlogSectionsEditor({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: BlogSectionJson[];
  onChange: (next: BlogSectionJson[]) => void;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(
    value.length > 0 ? 0 : null,
  );

  function updateAt(i: number, patch: Partial<BlogSectionJson>) {
    const next = value.slice();
    next[i] = { ...next[i], ...patch };
    onChange(next);
  }

  function move(i: number, delta: number) {
    const j = i + delta;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    setOpenIdx(j);
  }

  function remove(i: number) {
    if (!confirm("Delete this section?")) return;
    onChange(value.filter((_, j) => j !== i));
    setOpenIdx(null);
  }

  function add() {
    const next: BlogSectionJson = {
      id: newSectionId(),
      heading: "",
      headingLevel: "h2",
      text: "",
      images: [],
    };
    const list = [...value, next];
    onChange(list);
    setOpenIdx(list.length - 1);
  }

  return (
    <div className="space-y-3">
      {value.length === 0 ? (
        <div
          className="p-8 text-center rounded text-sm"
          style={{
            background: "var(--bg-subtle)",
            color: "var(--text-tertiary)",
            border: "1px dashed var(--border-default)",
          }}
        >
          No sections yet. Add one to start writing.
        </div>
      ) : (
        value.map((section, i) => {
          const open = openIdx === i;
          return (
            <div
              key={section.id ?? i}
              className="rounded overflow-hidden"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-default)",
              }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2"
                style={{ background: open ? "var(--bg-subtle)" : "transparent" }}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className="flex-1 text-left text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  <span
                    className="mr-2 inline-block w-5 text-center text-xs"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {i + 1}.
                  </span>
                  {section.heading?.trim() || (
                    <span style={{ color: "var(--text-tertiary)", fontStyle: "italic" }}>
                      Untitled section
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="h-7 px-2 text-xs rounded disabled:opacity-30"
                  style={{ color: "var(--text-secondary)" }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(i, +1)}
                  disabled={i === value.length - 1}
                  className="h-7 px-2 text-xs rounded disabled:opacity-30"
                  style={{ color: "var(--text-secondary)" }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="h-7 px-2 text-xs font-semibold rounded"
                  style={{ color: "var(--error)" }}
                >
                  Remove
                </button>
              </div>

              {open && (
                <div
                  className="p-4 space-y-4 border-t"
                  style={{ borderColor: "var(--border-default)" }}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-3">
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Heading (optional)
                      </label>
                      <input
                        value={section.heading ?? ""}
                        onChange={(e) => updateAt(i, { heading: e.target.value })}
                        className="w-full h-10 px-3 rounded text-sm"
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs font-semibold mb-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Level
                      </label>
                      <select
                        value={section.headingLevel ?? "h2"}
                        onChange={(e) =>
                          updateAt(i, {
                            headingLevel: e.target.value as "h2" | "h3" | "h4",
                          })
                        }
                        className="w-full h-10 px-2 rounded text-sm"
                        style={inputStyle}
                      >
                        <option value="h2">H2</option>
                        <option value="h3">H3</option>
                        <option value="h4">H4</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-xs font-semibold mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Body
                    </label>
                    <BlogRichEditor
                      slug={slug}
                      value={section.text}
                      onChange={(html) => updateAt(i, { text: html })}
                    />
                  </div>

                  <div>
                    <label
                      className="block text-xs font-semibold mb-2"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Section gallery
                    </label>
                    <GalleryEditor
                      tourSlug={slug}
                      resourceKind="blog"
                      images={(section.images ?? []).map((img) => ({
                        url: img.src,
                        alt: img.alt,
                      }))}
                      onChange={(next) =>
                        updateAt(i, {
                          images: next.map((img) => ({
                            src: img.url,
                            alt: img.alt,
                          })),
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      <button
        type="button"
        onClick={add}
        className="h-10 px-4 rounded font-semibold text-sm"
        style={{
          background: "var(--primary)",
          color: "var(--text-inverse)",
        }}
      >
        + Add section
      </button>
    </div>
  );
}
