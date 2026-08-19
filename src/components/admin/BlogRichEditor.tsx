"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import { useEffect, useRef } from "react";

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => {
        // Prevent the button from stealing focus from the editor
        e.preventDefault();
      }}
      onClick={onClick}
      className="h-8 min-w-8 px-2 rounded text-xs font-semibold disabled:opacity-40"
      style={{
        background: active ? "var(--primary-muted)" : "transparent",
        color: active ? "var(--primary)" : "var(--text-secondary)",
        border: "1px solid var(--border-default)",
      }}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  slug,
}: {
  editor: Editor;
  slug: string;
}) {
  async function uploadImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/avif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/admin/blog/${slug}/images`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? `Upload failed (${res.status})`);
        return;
      }
      const { url } = (await res.json()) as { url: string };
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
    };
    input.click();
  }

  function addLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove):", prev ?? "");
    if (url === null) return;
    if (!url) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: url })
      .run();
  }

  function addYoutube() {
    const url = window.prompt("YouTube URL:");
    if (!url) return;
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
  }

  function addInstagram() {
    const url = window.prompt("Instagram post URL (e.g. https://www.instagram.com/p/ABC123/):");
    if (!url) return;
    // Instagram's official embed endpoint: /p/{id}/embed
    const match = url.match(/instagram\.com\/(p|reel)\/([^/?#]+)/);
    if (!match) {
      alert("Not a recognized Instagram post/reel URL");
      return;
    }
    const embed = `https://www.instagram.com/${match[1]}/${match[2]}/embed`;
    // Insert as raw HTML iframe so it survives HTML round-trip
    editor
      .chain()
      .focus()
      .insertContent(
        `<iframe src="${embed}" allowfullscreen frameborder="0" scrolling="no" style="width:100%;aspect-ratio:1/1;border:0;"></iframe>`,
      )
      .run();
  }

  return (
    <div
      className="flex flex-wrap gap-1 p-2 rounded-t border-b"
      style={{
        background: "var(--bg-subtle)",
        borderColor: "var(--border-default)",
      }}
    >
      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        B
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <i>I</i>
      </ToolbarButton>
      <ToolbarButton
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        • List
      </ToolbarButton>
      <ToolbarButton
        title="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1. List
      </ToolbarButton>
      <ToolbarButton
        title="Blockquote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        &ldquo;
      </ToolbarButton>
      <ToolbarButton title="Link" active={editor.isActive("link")} onClick={addLink}>
        Link
      </ToolbarButton>
      <ToolbarButton title="Insert image (R2 upload)" onClick={uploadImage}>
        Image
      </ToolbarButton>
      <ToolbarButton title="Embed YouTube" onClick={addYoutube}>
        YouTube
      </ToolbarButton>
      <ToolbarButton title="Embed Instagram" onClick={addInstagram}>
        Instagram
      </ToolbarButton>
      <div className="ml-auto flex gap-1">
        <ToolbarButton
          title="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          ↶
        </ToolbarButton>
        <ToolbarButton
          title="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          ↷
        </ToolbarButton>
      </div>
    </div>
  );
}

export function BlogRichEditor({
  slug,
  value,
  onChange,
}: {
  slug: string;
  value: string;
  onChange: (html: string) => void;
}) {
  // Keep the latest onChange in a ref so we don't rebuild the editor when the
  // parent's callback identity changes.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Link is added separately below so it can autolink & open in new tab.
      }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
      }),
      Image.configure({
        HTMLAttributes: { class: "blog-inline-image" },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        nocookie: true,
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class:
          "blog-prose min-h-[300px] px-4 py-3 outline-none text-[15px] leading-[1.7]",
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getHTML());
    },
  });

  // If the parent replaces `value` externally (e.g., after loading a different
  // section), sync the editor content once. Comparing HTML avoids caret jumps
  // while the user is typing.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, value]);

  if (!editor) {
    return (
      <div
        className="rounded border p-4 text-sm"
        style={{
          background: "var(--bg-subtle)",
          borderColor: "var(--border-default)",
          color: "var(--text-tertiary)",
        }}
      >
        Loading editor…
      </div>
    );
  }

  return (
    <div
      className="rounded border overflow-hidden"
      style={{ borderColor: "var(--border-default)", background: "var(--bg-primary)" }}
    >
      <Toolbar editor={editor} slug={slug} />
      <EditorContent editor={editor} />
    </div>
  );
}
