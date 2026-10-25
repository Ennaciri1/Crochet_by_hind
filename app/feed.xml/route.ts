import { getCategories } from "@/lib/categories";
import { parseImageMeta } from "@/lib/images";
import { getPostsPage } from "@/lib/posts";
import { absoluteUrl, getSiteSettings } from "@/lib/site";

/**
 * /feed.xml — RSS feed of the 50 newest posts.
 *
 * Its main job is Pinterest: in a Pinterest business account, Settings →
 * "Bulk create Pins" → "Auto-publish" reads this feed and pins every new post
 * with its cover photo, automatically. Feed readers and some search tools use
 * it too.
 *
 * Built on every request, for the same reason as the sitemap: a cached copy
 * was observed staying frozen on the CDN, and a feed that misses new posts is
 * useless. It costs one query.
 */
export const dynamic = "force-dynamic";

/** Makes text safe inside XML. */
function esc(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const [{ posts }, categories, site] = await Promise.all([
    getPostsPage({ page: 1, perPage: 50 }),
    getCategories(),
    getSiteSettings(),
  ]);
  const categoryName = (slug: string) => categories.find((c) => c.slug === slug)?.name ?? slug;

  const items = posts
    .map((p) => {
      const link = absoluteUrl(`/blog/${p.slug}`);
      const image = p.cover_url ? absoluteUrl(parseImageMeta(p.cover_url).src) : "";
      // The photo is also placed at the top of the description, where feed
      // readers and Pinterest look for it.
      const html = `${image ? `<p><img src="${esc(image)}" alt="${esc(p.cover_alt || p.title)}" /></p>` : ""}<p>${esc(p.excerpt)}</p>`;
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(link)}</link>
      <guid isPermaLink="true">${esc(link)}</guid>
      <pubDate>${new Date(p.published_at ?? p.updated_at).toUTCString()}</pubDate>
      <category>${esc(categoryName(p.category))}</category>
      <description><![CDATA[${html.replace(/]]>/g, "]]&gt;")}]]></description>${
        image ? `\n      <media:content url="${esc(image)}" medium="image" />` : ""
      }
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${esc(site.name)}</title>
    <link>${esc(absoluteUrl("/"))}</link>
    <description>${esc(site.description)}</description>
    <language>en-us</language>
    <atom:link href="${esc(absoluteUrl("/feed.xml"))}" rel="self" type="application/rss+xml" />
    <image>
      <url>${esc(absoluteUrl("/logo.png"))}</url>
      <title>${esc(site.name)}</title>
      <link>${esc(absoluteUrl("/"))}</link>
    </image>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
