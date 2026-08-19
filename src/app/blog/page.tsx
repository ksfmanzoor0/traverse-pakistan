import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { buildMetadata } from "@/lib/seo/metadata";
import { getLatestBlogPosts } from "@/services/blog.service";

export const metadata: Metadata = buildMetadata({
  title: "Pakistan Travel Blog — Guides, Treks, Culture & Seasons",
  description:
    "First-hand travel guides from Pakistan: Hunza, Skardu, Kalash, Nanga Parbat, blossom and autumn seasons, treks, and local culture — by Traverse Pakistan.",
  path: "/blog",
  tags: ["Pakistan travel blog", "Hunza guide", "Pakistan travel tips"],
});

export default async function BlogPage() {
  const posts = await getLatestBlogPosts(20);
  const featured = posts[0];
  const rest = posts.slice(1);

  return (
    <div className="py-8 sm:py-12">
      <Container>
        <Breadcrumb items={[{ label: "Blog" }]} />
        <div className="mt-6 mb-10">
          <h1 className="text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] tracking-tight">
            Stories & Guides
          </h1>
          <p className="text-lg text-[var(--text-tertiary)] mt-2">
            Travel tips, destination guides, and inspiration for your next adventure
          </p>
        </div>

        {/* Featured */}
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="group relative block rounded-xl overflow-hidden h-[320px] sm:h-[400px] mb-10"
          >
            <Image
              src={featured.image}
              alt={featured.title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <span className="inline-block px-3 py-1 text-[11px] font-bold uppercase bg-[var(--primary)] text-[var(--text-inverse)] rounded-full mb-3">
                {featured.tag}
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--on-dark)]">
                {featured.title}
              </h2>
              <p className="text-[15px] text-[var(--on-dark-secondary)] mt-2 max-w-xl">
                {featured.excerpt}
              </p>
              <p className="text-[13px] text-[var(--on-dark-tertiary)] mt-3">{featured.readTime}</p>
            </div>
          </Link>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {rest.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group rounded-xl overflow-hidden border border-[var(--border-default)] hover:shadow-md transition-shadow"
            >
              <div className="relative aspect-[16/10]">
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              </div>
              <div className="p-5">
                <span className="text-[11px] font-semibold uppercase text-[var(--primary)]">
                  {post.tag}
                </span>
                <h3 className="text-[17px] font-bold text-[var(--text-primary)] mt-1 line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                  {post.title}
                </h3>
                <p className="text-[14px] text-[var(--text-tertiary)] mt-2 line-clamp-2">
                  {post.excerpt}
                </p>
                <p className="text-[12px] text-[var(--text-tertiary)] mt-3">
                  {post.readTime}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </div>
  );
}
