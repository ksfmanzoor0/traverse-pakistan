import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { JsonLd } from "@/components/seo/JsonLd";
import { buildMetadata } from "@/lib/seo/metadata";
import {
  articleSchema,
  breadcrumbSchema,
  combineSchemas,
} from "@/lib/seo/schema";
import { getBlogPostBySlug, getAllBlogPosts } from "@/services/blog.service";
import { sanitizeBlogHtml } from "@/lib/blog/sanitize";

// Admin-authored content — render fresh on every request so Save is instant.
// Supabase read is a cheap indexed slug lookup wrapped in unstable_cache, so
// the actual DB hit only happens after the 'blog' tag is revalidated.
export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) {
    return buildMetadata({
      title: "Post Not Found",
      path: `/blog/${slug}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: post.metaTitle,
    description: post.metaDescription,
    path: `/blog/${post.slug}`,
    image: post.image,
    imageAlt: post.title,
    type: "article",
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
    authors: [post.author],
    tags: post.tags,
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  const schema = combineSchemas(
    articleSchema(post, post.updatedAt),
    breadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Blog", url: "/blog" },
      { name: post.title, url: `/blog/${post.slug}` },
    ])
  );

  return (
    <div className="py-8 sm:py-12">
      <JsonLd data={schema} id={`blog-${post.slug}-jsonld`} />
      <Container>
        <div className="max-w-[800px] mx-auto">
          <Breadcrumb
            items={[
              { label: "Blog", href: "/blog" },
              { label: post.title },
            ]}
          />

          <div className="mt-6">
            <div className="flex flex-wrap gap-2">
              <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase bg-[var(--primary)] text-[var(--text-inverse)] rounded-full">
                {post.tag}
              </span>
              {post.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="inline-block px-3 py-1 text-[11px] font-semibold uppercase border border-[var(--border-default)] text-[var(--text-tertiary)] rounded-full"
                >
                  {t}
                </span>
              ))}
            </div>
            <h1 className="text-[28px] sm:text-[38px] font-bold text-[var(--text-primary)] tracking-tight mt-3 leading-tight">
              {post.title}
            </h1>
            <div className="flex items-center gap-4 mt-4 text-[14px] text-[var(--text-tertiary)]">
              <span>{post.author}</span>
              <span>&middot;</span>
              <span>
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <span>&middot;</span>
              <span>{post.readTime}</span>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative aspect-[16/9] rounded-xl overflow-hidden mt-8">
            <Image
              src={post.image}
              alt={post.title}
              fill
              className="object-cover"
              sizes="800px"
              priority
            />
          </div>

          {/* Article Content */}
          <article className="mt-10">
            {/* Excerpt as lead paragraph */}
            {post.excerpt && (
              <p className="text-[18px] leading-relaxed text-[var(--text-secondary)] font-medium mb-8">
                {post.excerpt}
              </p>
            )}

            {/* Sections */}
            {post.sections.map((section, i) => (
              <div key={i} className="mb-10">
                {section.heading && section.headingLevel === "h2" && (
                  <h2 className="text-[24px] sm:text-[28px] font-bold text-[var(--text-primary)] mt-10 mb-4">
                    {section.heading}
                  </h2>
                )}
                {section.heading && section.headingLevel === "h3" && (
                  <h3 className="text-[20px] sm:text-[22px] font-bold text-[var(--text-primary)] mt-8 mb-3">
                    {section.heading}
                  </h3>
                )}
                {section.heading && section.headingLevel === "h4" && (
                  <h4 className="text-[17px] sm:text-[18px] font-semibold text-[var(--text-secondary)] mt-6 mb-2">
                    {section.heading}
                  </h4>
                )}

                {/* Section text — sanitized HTML from the editor */}
                {section.text && (
                  <div
                    className="blog-prose text-[16px] leading-[1.8] text-[var(--text-secondary)]"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeBlogHtml(section.text),
                    }}
                  />
                )}

                {/* Section images */}
                {section.images && section.images.length > 0 && (
                  <div
                    className={`mt-6 mb-6 ${
                      section.images.length === 1
                        ? ""
                        : "grid grid-cols-1 sm:grid-cols-2 gap-3"
                    }`}
                  >
                    {section.images.map((img, k) => (
                      <figure key={k} className="rounded-lg overflow-hidden">
                        <div className="relative aspect-[4/3]">
                          <Image
                            src={img.src}
                            alt={img.alt || post.title}
                            fill
                            className="object-cover"
                            sizes={
                              section.images!.length === 1
                                ? "800px"
                                : "(max-width: 640px) 100vw, 400px"
                            }
                          />
                        </div>
                        {img.caption && (
                          <figcaption className="text-[13px] text-[var(--text-tertiary)] mt-2 italic px-1">
                            {img.caption}
                          </figcaption>
                        )}
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </article>

          {/* Back to blog */}
          <div className="mt-12 pt-8 border-t border-[var(--border-default)]">
            <Link
              href="/blog"
              className="text-[15px] font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)] transition-colors"
            >
              ← Back to all articles
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
