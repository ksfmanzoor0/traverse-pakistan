import DOMPurify from "isomorphic-dompurify";

// Sanitize HTML from the blog editor (TipTap output) before rendering with
// dangerouslySetInnerHTML. Allowlist covers standard rich text + YouTube and
// Instagram iframe embeds (added in the TipTap step).
const CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ADD_TAGS: ["iframe"],
  ADD_ATTR: [
    "allow",
    "allowfullscreen",
    "frameborder",
    "scrolling",
    "target",
    "rel",
  ],
  ALLOWED_URI_REGEXP:
    /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
};

export function sanitizeBlogHtml(html: string): string {
  if (!html) return "";
  return DOMPurify.sanitize(html, CONFIG) as unknown as string;
}
