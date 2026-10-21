import type { Metadata } from "next";
import Link from "next/link";
import AdSlot from "@/components/AdSlot";
import { CategoryTiles } from "@/components/CategoryNav";
import CoverImage from "@/components/CoverImage";
import JsonLd from "@/components/JsonLd";
import { PostGrid } from "@/components/PostCard";
import YarnBall from "@/components/YarnBall";
import { getCategories, getCategory, yarnVars } from "@/lib/categories";
import { QUALITY_COVER } from "@/lib/images";
import { getPostsPage, POSTS_PER_PAGE } from "@/lib/posts";
import { absoluteUrl, getSiteSettings } from "@/lib/site";

export const revalidate = 300; // ISR: rebuild at most every 5 minutes

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    alternates: { canonical: "/" },
    openGraph: { url: "/", title: `${site.name} – Free Crochet Patterns`, description: site.description },
  };
}

export default async function HomePage() {
  // One extra post: the newest is featured in the hero, the rest fill the grid.
  const [{ posts }, categories, site] = await Promise.all([
    getPostsPage({ page: 1, perPage: POSTS_PER_PAGE + 1 }),
    getCategories(),
    getSiteSettings(),
  ]);
  const [newest, ...rest] = posts;
  const newestCategory = newest ? await getCategory(newest.category) : undefined;

  return (
    <>
      {/* WebSite + SearchAction: lets Google show a search box for the site */}
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: site.name,
          url: absoluteUrl("/"),
          potentialAction: {
            "@type": "SearchAction",
            target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}` },
            "query-input": "required name=search_term_string",
          },
        }}
      />

      <div className="wrap">
        <section className="hero">
          <div className="hero-text">
            <span className="eyebrow">Free crochet patterns · US terms</span>
            <h1>
              Happy little things to make with <span className="hl">cotton yarn</span> and a hook.
            </h1>
            <p className="hero-lede">
              Clear, tested patterns for beginners and seasoned makers: amigurumi friends, cozy wearables and
              colorful pieces for your home. Every pattern is free to read here.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/category/free-patterns">
                Browse free patterns
              </Link>
              <a className="btn" href={site.etsy} target="_blank" rel="noopener">
                Ad-free PDFs on Etsy
              </a>
            </div>
          </div>

          <div className="hero-art">
            {/* Decorative yarn balls around the newest post */}
            <YarnBall className="deco deco-1" color="var(--yarn-rose)" size={96} />
            <YarnBall className="deco deco-2" color="var(--yarn-butter)" size={74} />
            <YarnBall className="deco deco-3" color="var(--yarn-mint)" size={58} tail={false} />
            <YarnBall className="deco deco-4" color="var(--yarn-sky)" size={66} />

            {newest ? (
              <Link href={`/blog/${newest.slug}`} className="hero-feature" style={yarnVars(newestCategory?.color)}>
                <div className="media">
                  <CoverImage
                    src={newest.cover_url}
                    alt={newest.cover_alt || newest.title}
                    /* The card is never wider than 340px, so neither is the file. */
                    sizes="(max-width: 879px) 320px, 340px"
                    quality={QUALITY_COVER}
                    priority
                  />
                </div>
                <div className="hero-feature-text">
                  <span className="chip">New · {newestCategory?.name}</span>
                  <h2>{newest.title}</h2>
                </div>
              </Link>
            ) : (
              <div className="hero-feature hero-empty">
                <YarnBall color="var(--yarn-rose)" size={150} />
              </div>
            )}
          </div>
        </section>

        <CategoryTiles categories={categories} />

        <div className="section-head">
          <h2>Latest patterns</h2>
          <Link href="/category/free-patterns">See all →</Link>
        </div>

        {rest.length > 0 ? (
          <PostGrid posts={rest} />
        ) : (
          <p className="empty">
            {newest ? "More patterns are on the hook. Come back soon!" : "No posts yet. Write your first one in /admin."}
          </p>
        )}

        <AdSlot
          format="display"
          client={site.adsEnabled ? site.adsenseClient : ""}
          slotDisplay={site.adsenseSlotDisplay}
          slotInArticle={site.adsenseSlotInArticle}
        />
      </div>
    </>
  );
}
