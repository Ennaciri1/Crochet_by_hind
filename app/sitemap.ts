import type { MetadataRoute } from "next";
import { getCategories } from "@/lib/categories";
import { parseImageMeta } from "@/lib/images";
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

/**
 * /sitemap.xml — home, the blog index, categories, every published post and
 * the legal pages.
 *
 * Each post lists its cover photo, so Google Images (a big source of visitors
 * for crochet) finds the photos even before it renders the page. Dates are the
 * real "last changed" dates: Google ignores lastmod when it is always "now".
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, categories] = await Promise.all([getAllPublishedSlugs(), getCategories()]);

  // Newest change overall, and per category (posts come newest first).
  const latest = (list: typeof posts) =>
    list.reduce<Date | undefined>((max, p) => {
      const d = new Date(p.updated_at);
      return !max || d > max ? d : max;
    }, undefined);
  const siteUpdated = latest(posts);

  return [
    { url: absoluteUrl("/"), lastModified: siteUpdated, changeFrequency: "daily", priority: 1 },
    { url: absoluteUrl("/blog"), lastModified: siteUpdated, changeFrequency: "daily", priority: 0.9 },
    // Only categories that have posts: an empty one is marked noindex.
    ...categories
      .filter((c) => posts.some((p) => p.category === c.slug))
      .map((c) => ({
        url: absoluteUrl(`/category/${c.slug}`),
        lastModified: latest(posts.filter((p) => p.category === c.slug)),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    ...posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: new Date(p.updated_at),
      changeFrequency: "monthly" as const,
      priority: 0.9,
      ...(p.cover_url ? { images: [absoluteUrl(parseImageMeta(p.cover_url).src)] } : {}),
    })),
    ...["/about", "/contact", "/privacy-policy", "/terms", "/disclaimer"].map((path) => ({
      url: absoluteUrl(path),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];
}
