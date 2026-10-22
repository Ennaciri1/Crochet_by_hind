import type { MetadataRoute } from "next";
import { getCategories } from "@/lib/categories";
import { getAllPublishedSlugs } from "@/lib/posts";
import { absoluteUrl } from "@/lib/site";

/**
 * Built on every request instead of cached.
 *
 * With `revalidate` this route was served straight from the CDN with no
 * Next.js revalidation headers, so a sitemap generated at deploy time stayed
 * frozen for hours and new posts never appeared in it. A sitemap is one
 * indexed query and is fetched by crawlers a handful of times a day, so the
 * cost of always being correct is negligible — and a stale sitemap is the one
 * thing that stops Google finding new patterns.
 */
export const dynamic = "force-dynamic";

/** /sitemap.xml — home, categories, every published post and the legal pages. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([getAllPublishedSlugs(), getCategories()]);
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
