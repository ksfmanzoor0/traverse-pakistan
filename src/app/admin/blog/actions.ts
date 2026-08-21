"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/guard";
import type { BlogSectionJson } from "@/lib/supabase/types";

export type BlogPatch = {
  title?: string;
  excerpt?: string;
  content?: string;
  image?: string;
  tag?: string;
  tags?: string[];
  categories?: string[];
  author?: string;
  read_time?: string;
  destination_slug?: string | null;
  meta_title?: string;
  meta_description?: string;
  sections?: BlogSectionJson[];
  published?: boolean;
  published_at?: string | null;
};

function revalidateBlog(slug?: string) {
  revalidateTag("blog", {});
  revalidatePath("/blog");
  if (slug) revalidatePath(`/blog/${slug}`);
  revalidatePath("/admin/blog");
  // Homepage BlogGrid also reads blog data — invalidate its cache too.
  revalidatePath("/");
}

export async function createBlogPost(input: {
  slug: string;
  title: string;
}): Promise<{ ok: true; slug: string } | { ok: false; error: string }> {
  await requireAdmin();
  const slug = input.slug.trim().toLowerCase();
  const title = input.title.trim();
  if (!/^[a-z0-9-]{3,}$/.test(slug)) {
    return { ok: false, error: "Slug must be lowercase, at least 3 chars, only a-z 0-9 and hyphens" };
  }
  if (title.length < 3) return { ok: false, error: "Title required" };

  const id = `blog-${slug}`;
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("blog_posts").insert({
    id,
    slug,
    title,
    excerpt: "",
    content: "",
    image: "",
    tag: "",
    tags: [],
    categories: [],
    author: "Traverse Pakistan",
    read_time: "3 min read",
    destination_slug: null,
    meta_title: title,
    meta_description: "",
    sections: [],
    published: false,
    published_at: null,
  });

  if (error) return { ok: false, error: error.message };

  revalidateBlog(slug);
  redirect(`/admin/blog/${slug}`);
}

export async function updateBlogPost(
  slug: string,
  patch: BlogPatch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const updates: BlogPatch & { published_at?: string | null } = { ...patch };

  // Normalize sections: if a section has a heading but no headingLevel, the
  // public renderer would silently hide the heading. Default to h2.
  if (Array.isArray(updates.sections)) {
    updates.sections = updates.sections.map((sec) => {
      const heading = sec.heading?.trim() ?? "";
      const level = sec.headingLevel;
      if (heading && (level === null || level === undefined)) {
        return { ...sec, headingLevel: "h2" };
      }
      return sec;
    });
  }

  if (patch.published === true) {
    const { data: existing } = await supabase
      .from("blog_posts")
      .select("published_at")
      .eq("slug", slug)
      .maybeSingle();
    if (!existing?.published_at) updates.published_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("blog_posts")
    .update(updates)
    .eq("slug", slug);

  if (error) return { ok: false, error: error.message };
  revalidateBlog(slug);
  return { ok: true };
}

export async function setBlogPublished(
  slug: string,
  published: boolean,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return updateBlogPost(slug, { published });
}

export async function deleteBlogPost(
  slug: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("blog_posts").delete().eq("slug", slug);
  if (error) return { ok: false, error: error.message };
  revalidateBlog(slug);
  return { ok: true };
}
