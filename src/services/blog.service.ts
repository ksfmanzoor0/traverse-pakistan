import { cache } from "react";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { BlogPost, BlogSection } from "@/types/blog";

// Raw Supabase row (snake_case) → BlogPost (camelCase) shape adapter.
type RawBlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  tag: string;
  tags: string[];
  categories: string[];
  author: string;
  read_time: string;
  destination_slug: string | null;
  meta_title: string;
  meta_description: string;
  sections: BlogSection[];
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

const BLOG_SELECT = `
  id, slug, title, excerpt, content, image, tag, tags, categories, author,
  read_time, destination_slug, meta_title, meta_description, sections,
  published, published_at, updated_at
`;

function toBlogPost(row: RawBlogPost): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    content: row.content,
    sections: row.sections ?? [],
    image: row.image,
    tag: row.tag,
    tags: row.tags ?? [],
    categories: row.categories ?? [],
    publishedAt: row.published_at ?? row.updated_at,
    updatedAt: row.updated_at,
    readTime: row.read_time,
    author: row.author,
    destinationSlug: row.destination_slug ?? undefined,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
  };
}

const _fetchAllPublishedBlogPosts = unstable_cache(
  async (): Promise<BlogPost[]> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(BLOG_SELECT)
      .eq("published", true)
      .order("published_at", { ascending: false, nullsFirst: false });
    if (error) throw new Error(`getAllBlogPosts: ${error.message}`);
    return (data as unknown as RawBlogPost[]).map(toBlogPost);
  },
  ["all-blog-posts"],
  { tags: ["blog"], revalidate: 3600 },
);

export const getAllBlogPosts = cache(_fetchAllPublishedBlogPosts);

const _fetchBlogPostBySlug = unstable_cache(
  async (slug: string): Promise<BlogPost | null> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("blog_posts")
      .select(BLOG_SELECT)
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(`getBlogPostBySlug: ${error.message}`);
    return data ? toBlogPost(data as unknown as RawBlogPost) : null;
  },
  ["blog-post-by-slug"],
  { tags: ["blog"], revalidate: 3600 },
);

export const getBlogPostBySlug = cache(_fetchBlogPostBySlug);

export const getBlogPostsByDestination = cache(
  async (destinationSlug: string): Promise<BlogPost[]> => {
    const all = await getAllBlogPosts();
    return all.filter((p) => p.destinationSlug === destinationSlug);
  },
);

export const getLatestBlogPosts = cache(
  async (limit: number = 6): Promise<BlogPost[]> => {
    const all = await getAllBlogPosts();
    return all.slice(0, limit);
  },
);
