import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { getLatestBlogPosts } from "@/services/blog.service";

export async function BlogGrid() {
  const posts = await getLatestBlogPosts(5);
  const featured = posts[0];
  const rest = posts.slice(1, 5);

  return (
    <section className="py-20 sm:py-24 bg-[var(--bg-primary)]">
      <Container wide>
        <SectionHeader
          title="Stories & Guides"
          subtitle="Travel tips, destination guides, and inspiration"
          linkText="Read the blog"
          linkHref="/blog"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          {/* Featured — tall card */}
          {featured && (
            <Link
              href={`/blog/${featured.slug}`}
              className="group relative rounded-[var(--radius-lg)] overflow-hidden md:row-span-2 min-h-[320px]"
            >
              <Image
                src={featured.image}
                alt={featured.title}
                fill
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.04]"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
                <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] bg-[var(--primary)] text-[var(--on-dark)] rounded-[var(--radius-full)] mb-3">
                  {featured.tag}
                </span>
                <h3
                  className="text-xl sm:text-2xl font-bold text-[var(--on-dark)] leading-snug tracking-[-0.02em]"
                  style={{ textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
                >
                  {featured.title}
                </h3>
                <p className="text-[14px] text-[var(--on-dark-secondary)] mt-2 line-clamp-2 max-w-md">
                  {featured.excerpt}
                </p>
                <span className="inline-flex items-center gap-1 mt-3 text-[12px] font-medium text-[var(--on-dark-tertiary)]">
                  {featured.readTime}
                </span>
              </div>
              <div className="absolute inset-0 ring-1 ring-inset ring-transparent group-hover:ring-[var(--on-dark-border)] rounded-[var(--radius-lg)] transition-all duration-500" />
            </Link>
          )}

          {/* Grid items */}
          {rest.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group relative rounded-[var(--radius-md)] overflow-hidden aspect-[16/10]"
            >
              <Image
                src={post.image}
                alt={post.title}
                fill
                className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-[1.04]"
                sizes="(max-width: 768px) 100vw, 45vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[var(--primary-muted)]">
                  {post.tag}
                </span>
                <h3
                  className="text-[15px] sm:text-[16px] font-bold text-[var(--on-dark)] mt-1 line-clamp-2 leading-snug"
                  style={{ textShadow: "0 1px 6px rgba(0,0,0,0.4)" }}
                >
                  {post.title}
                </h3>
                <span className="text-[11px] text-[var(--on-dark-tertiary)] mt-1 block">{post.readTime}</span>
              </div>
              <div className="absolute inset-0 ring-1 ring-inset ring-transparent group-hover:ring-[var(--on-dark-border)] rounded-[var(--radius-md)] transition-all duration-500" />
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
