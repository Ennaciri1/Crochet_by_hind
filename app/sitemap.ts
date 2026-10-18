import type { MetadataRoute } from "next";
import { categories } from "@/lib/categories";
import { getAllPublishedSlugs } from "@/lib/posts";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 300;

/** /sitemap.xml — home, categories, every published post and the legal pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPublishedSlugs();
  const now = new Date();

  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    ...categories.map((c) => ({
      url: absoluteUrl(`/category/${c.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: new Date(p.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...["/about", "/contact", "/privacy-policy", "/terms", "/disclaimer"].map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
