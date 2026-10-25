import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import Breadcrumbs from "@/components/Breadcrumbs";
import { CategoryPills } from "@/components/CategoryNav";
import Pagination from "@/components/Pagination";
import { PostGrid } from "@/components/PostCard";
import { getCategories, getCategory } from "@/lib/categories";
import { getPostsPage } from "@/lib/posts";
import { getSiteSettings } from "@/lib/site";

/**
 * One category listing, shared by /category/[slug] (page 1) and
 * /category/[slug]/page/[n]. Both are statically generated: reading a "?page="
 * search param instead would make the route dynamic and cost us the cache.
 */

export async function categoryMetadata(slug: string, page: number): Promise<Metadata> {
  const [category, { total }] = await Promise.all([
    getCategory(slug),
    getPostsPage({ category: slug, perPage: 1 }),
  ]);
  if (!category) return {};

  const base = slug === "free-patterns" ? "Free Crochet Patterns" : `${category.name} Crochet Patterns`;
  const title = page > 1 ? `${base} — Page ${page}` : base;
  const path = page > 1 ? `/category/${slug}/page/${page}` : `/category/${slug}`;

  return {
    title,
    description: category.description,
    alternates: { canonical: path },
    // Page 2 and beyond add nothing for a searcher; keep them crawlable but out
    // of the index so the category root is the one result that ranks.
    // An empty category ("come back soon") is thin content that Google holds
    // against the whole site, so it stays out of the index until its first
    // post is published — automatically, nothing to do in /admin.
    // (Spread, not "robots: undefined", which would wipe the site-wide setting.)
    ...(page > 1 || total === 0 ? { robots: { index: false, follow: true } } : {}),
    openGraph: { url: path, title, description: category.description },
  };
}

export default async function CategoryListing({ slug, page }: { slug: string; page: number }) {
  const [category, categories, site] = await Promise.all([
    getCategory(slug),
    getCategories(),
    getSiteSettings(),
  ]);
  if (!category) notFound();

  const { posts, totalPages } = await getPostsPage({ category: slug, page });
  if (posts.length === 0 && page > 1) notFound();

  return (
    <div className="wrap">
      <header className="page-head category-head">
        <Breadcrumbs items={[{ name: category.name, href: `/category/${slug}` }]} />
        <h1>{category.name}</h1>
        <p>{category.description}</p>
        <CategoryPills categories={categories} current={slug} />
      </header>

      {posts.length > 0 ? (
        <>
          <PostGrid posts={posts} />
          <Pagination page={page} totalPages={totalPages} basePath={`/category/${slug}`} />
          <AdSlot
            format="display"
            client={site.adsEnabled ? site.adsenseClient : ""}
            slotDisplay={site.adsenseSlotDisplay}
            slotInArticle={site.adsenseSlotInArticle}
          />
        </>
      ) : (
        <p className="empty">No patterns in this category yet. Come back soon!</p>
      )}
    </div>
  );
}
