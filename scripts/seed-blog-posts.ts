import { createClient } from "@supabase/supabase-js";
import { blogPosts } from "../src/data/blog-posts";
import type { BlogSection } from "../src/types/blog";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// HTML escape (safe against injection when text is later rendered with
// dangerouslySetInnerHTML). Runs BEFORE auto-linking so injected <a> tags
// aren't escaped themselves.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Wrap bare http(s) URLs in anchor tags. Matches a URL until whitespace,
// closing paren, or end of string; trims trailing punctuation that's
// typically sentence punctuation not part of the URL.
function autoLink(escaped: string): string {
  const URL_RE = /(https?:\/\/[^\s<)]+)/g;
  return escaped.replace(URL_RE, (raw) => {
    const trailing = raw.match(/[.,;:!?]+$/)?.[0] ?? "";
    const href = trailing ? raw.slice(0, -trailing.length) : raw;
    return `<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>${trailing}`;
  });
}

function textToHtml(text: string): string {
  if (!text || !text.trim()) return "";
  const normalized = text.replace(/\r\n/g, "\n");
  return normalized
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => `<p>${autoLink(escapeHtml(chunk))}</p>`)
    .join("\n");
}

function convertSection(section: BlogSection, idx: number, postId: string) {
  return {
    id: `${postId}-s${idx + 1}`,
    heading: section.heading ?? null,
    headingLevel: section.headingLevel ?? null,
    text: textToHtml(section.text),
    images: section.images ?? [],
  };
}

async function run() {
  console.log(`Seeding ${blogPosts.length} blog posts...`);

  const rows = blogPosts.map((post) => ({
    id: post.id,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    content: post.content,
    image: post.image,
    tag: post.tag,
    tags: post.tags,
    categories: post.categories,
    author: post.author,
    read_time: post.readTime,
    destination_slug: post.destinationSlug ?? null,
    meta_title: post.metaTitle,
    meta_description: post.metaDescription,
    sections: post.sections.map((s, i) => convertSection(s, i, post.id)),
    published: true,
    published_at: new Date(post.publishedAt).toISOString(),
  }));

  const { error } = await supabase
    .from("blog_posts")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }

  const { count, error: countErr } = await supabase
    .from("blog_posts")
    .select("*", { count: "exact", head: true });

  if (countErr) {
    console.error("Count failed:", countErr.message);
    process.exit(1);
  }

  console.log(`Seed complete. blog_posts row count: ${count}`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
