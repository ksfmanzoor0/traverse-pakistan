import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { BlogEditor } from "@/components/admin/BlogEditor";
import type { BlogPostRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

async function getPost(slug: string): Promise<BlogPostRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as BlogPostRow) ?? null;
}

export default async function BlogEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-4">
        <Link
          href="/admin/blog"
          className="text-sm hover:underline"
          style={{ color: "var(--text-secondary)" }}
        >
          ← Back to blog
        </Link>
      </div>
      <BlogEditor post={post} />
    </div>
  );
}
