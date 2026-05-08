import type { MetadataRoute } from "next";
import { tours } from "@/data/tours";
import { destinations } from "@/data/destinations";
import { regions } from "@/data/regions";
import { blogPosts } from "@/data/blog-posts";
import { travelStyles } from "@/data/travel-styles";
import { getAllPackages } from "@/services/package.service";
import { hotels } from "@/data/hotels";
import { absoluteUrl } from "@/lib/seo/site";

export const dynamic = "force-static";
export const revalidate = 86400; // regenerate once per day

type ChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

const today = new Date();

function entry(
  path: string,
  priority: number,
  changeFrequency: ChangeFrequency,
  lastModified: string | Date = today
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified:
      typeof lastModified === "string" ? new Date(lastModified) : lastModified,
    changeFrequency,
    priority,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const packages = await getAllPackages();
  const staticPages: MetadataRoute.Sitemap = [
    entry("/", 1.0, "weekly"),
    entry("/grouptours", 0.95, "daily"),
    entry("/packages", 0.95, "weekly"),
    entry("/destinations", 0.9, "weekly"),
    entry("/hotels", 0.9, "weekly"),
    entry("/travel-styles", 0.75, "monthly"),
    entry("/blog", 0.8, "weekly"),
    entry("/about", 0.6, "yearly"),
    entry("/contact", 0.6, "yearly"),
    entry("/privacy", 0.3, "yearly"),
    entry("/terms", 0.3, "yearly"),
    entry("/cancellation", 0.5, "yearly"),
  ];

  const tourPages = tours.map((t) =>
    entry(`/grouptours/${t.slug}`, 0.85, "weekly")
  );

  const packagePages = packages.map((p) =>
    entry(`/packages/${p.slug}`, 0.85, "weekly")
  );

  const destPages = destinations.map((d) =>
    entry(`/destinations/${d.slug}`, 0.8, "weekly")
  );

  const regionPages = regions.map((r) =>
    entry(`/regions/${r.slug}`, 0.75, "monthly")
  );

  const hotelPages = hotels.map((h) =>
    entry(`/hotels/${h.slug}`, 0.75, "weekly")
  );

  const blogPages = blogPosts.map((p) =>
    entry(
      `/blog/${p.slug}`,
      0.6,
      "monthly",
      p.updatedAt || p.publishedAt
    )
  );

  const stylePages = travelStyles.map((s) =>
    entry(`/travel-styles/${s.slug}`, 0.6, "monthly")
  );

  return [
    ...staticPages,
    ...tourPages,
    ...packagePages,
    ...destPages,
    ...regionPages,
    ...hotelPages,
    ...blogPages,
    ...stylePages,
  ];
}
