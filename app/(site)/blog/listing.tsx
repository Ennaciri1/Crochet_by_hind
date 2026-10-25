import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import Breadcrumbs from "@/components/Breadcrumbs";
import { CategoryPills } from "@/components/CategoryNav";
import JsonLd from "@/components/JsonLd";
import Pagination from "@/components/Pagination";
import { PostGrid } from "@/components/PostCard";
import { getCategories } from "@/lib/categories";
import { getPostsPage } from "@/lib/posts";
import { organizationSchema } from "@/lib/schema";
import { absoluteUrl, getSiteSettings } from "@/lib/site";

/**
 * The blog index: every published post, newest first, shared by /blog (page 1)
 * and /blog/page/[n]. Like the category listings it paginates by path, not by
 * "?page=", so every page stays statically generated.
 *
 * It gives Google one crawlable hub that links to every post, whatever its
 * category, and gives readers a "see everything" page.
 */

const TITLE = "Free Crochet Patterns & Tutorials";
const DESCRIPTION =
  "Every free crochet pattern and tutorial on the blog, newest first: amigurumi, wearables, home decor and step-by-step lessons in US terms.";

export function blogMetadata(page: number): Metadata {
  const title = page > 1 ? `${TITLE} — Page ${page}` : `Blog: ${TITLE}`;
  const path = page > 1 ? `/blog/page/${page}` : "/blog";
  return {
    title,
    description: DESCRIPTION,
    alternates: {
      canonical: path,
      types: { "application/rss+xml": "/feed.xml" },
    },
    // Page 2+ stays crawlable (its links lead to older posts) but out of the
    // index, so /blog is the one listing URL that ranks.
    // (Spread, not "robots: undefined", which would wipe the site-wide setting.)
    ...(page > 1 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { url: path, title, description: DESCRIPTION },
  };
}

export default async function BlogListing({ page }: { page: number }) {
  const [{ posts, totalPages }, categories, site] = await Promise.all([
    getPostsPage({ page }),
    getCategories(),
    getSiteSettings(),
  ]);
  if (posts.length === 0 && page > 1) notFound();

  return (
    <div className="wrap">
      {/* Blog + its posts, so Google understands this page lists articles */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Blog",
          name: `${site.name} Blog`,
          description: DESCRIPTION,
          url: absoluteUrl(page > 1 ? `/blog/page/${page}` : "/blog"),
          publisher: organizationSchema(site),
          blogPost: posts.map((p) => ({
            "@type": "BlogPosting",
            headline: p.title,
            url: absoluteUrl(`/blog/${p.slug}`),
            datePublished: p.published_at,
            dateModified: p.updated_at,
            ...(p.cover_url ? { image: absoluteUrl(p.cover_url) } : {}),
          })),
        }}
      />

      <header className="page-head category-head">
        <Breadcrumbs items={[{ name: "Blog", href: "/blog" }]} />
        <span className="eyebrow">The blog</span>
        <h1>{page > 1 ? `${TITLE} — Page ${page}` : TITLE}</h1>
        <p>{DESCRIPTION}</p>
        <CategoryPills categories={categories} />
      </header>

      {posts.length > 0 ? (
        <>
          <PostGrid posts={posts} />
          <Pagination page={page} totalPages={totalPages} basePath="/blog" />
          <AdSlot
            format="display"
            client={site.adsEnabled ? site.adsenseClient : ""}
            slotDisplay={site.adsenseSlotDisplay}
            slotInArticle={site.adsenseSlotInArticle}
          />
        </>
      ) : (
        <p className="empty">No posts yet. Come back soon!</p>
      )}
    </div>
  );
}
