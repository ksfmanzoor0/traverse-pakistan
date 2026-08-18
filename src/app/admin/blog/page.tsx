import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { NewBlogPostForm } from "@/components/admin/NewBlogPostForm";

export const dynamic = "force-dynamic";

type Row = {
  slug: string;
  title: string;
  tag: string;
  published: boolean;
  published_at: string | null;
  updated_at: string;
};

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

async function getPosts(): Promise<Row[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("blog_posts")
    .select("slug, title, tag, published, published_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

export default async function BlogAdminIndex() {
  const rows = await getPosts();
  const published = rows.filter((r) => r.published).length;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            Blog
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            {rows.length} total · {published} published · {rows.length - published} draft
          </p>
        </div>
      </div>

      <NewBlogPostForm />

      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: "var(--bg-primary)",
          border: "1px solid var(--border-default)",
        }}
      >
        {rows.length === 0 ? (
          <div
            className="p-12 text-center text-sm"
            style={{ color: "var(--text-tertiary)" }}
          >
            No blog posts yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="text-left"
                  style={{
                    background: "var(--bg-subtle)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Tag
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Published
                  </th>
                  <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wider">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.slug}
                    style={{
                      borderTop: "1px solid var(--border-default)",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/blog/${row.slug}`}
                        className="font-medium hover:underline"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {row.title}
                      </Link>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        /{row.slug}
                      </div>
                    </td>
                    <td className="px-4 py-3">{row.tag || "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: row.published
                            ? "var(--primary-muted)"
                            : "var(--bg-subtle)",
                          color: row.published
                            ? "var(--primary)"
                            : "var(--text-tertiary)",
                        }}
                      >
                        {row.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">{fmt(row.published_at)}</td>
                    <td className="px-4 py-3">{fmt(row.updated_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
