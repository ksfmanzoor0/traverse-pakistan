import DOMPurify from "isomorphic-dompurify";

// Sanitize HTML from the blog editor (TipTap output) before rendering with
// dangerouslySetInnerHTML. Allowlist covers standard rich text + YouTube and
// Instagram iframe embeds (added in the TipTap step).
// Iframes are allowed only for youtube-nocookie.com, youtube.com, and
// instagram.com hosts — checked via ADD_URI_SAFE_ATTR + a hook below.
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

const IFRAME_ALLOWED_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "www.youtube-nocookie.com",
  "youtube-nocookie.com",
  "www.instagram.com",
  "instagram.com",
]);

DOMPurify.addHook("uponSanitizeElement", (node, data) => {
  if (data.tagName !== "iframe") return;
  const el = node as unknown as Element;
  const src = el.getAttribute("src") ?? "";
  try {
    const u = new URL(src);
    if (!IFRAME_ALLOWED_HOSTS.has(u.hostname)) el.remove();
  } catch {
    el.remove();
  }
});

export function sanitizeBlogHtml(html: unknown): string {
  if (typeof html !== "string" || !html) return "";
  try {
    return DOMPurify.sanitize(html, CONFIG) as unknown as string;
  } catch (err) {
    // Never 500 the page for a bad section; log so we can see it in Vercel.
    console.error("[sanitizeBlogHtml] threw on input:", {
      length: html.length,
      preview: html.slice(0, 200),
      error: err instanceof Error ? err.message : String(err),
    });
    return "";
  }
}
