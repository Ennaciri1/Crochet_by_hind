import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import AuthorBio from "@/components/AuthorBio";
import Breadcrumbs from "@/components/Breadcrumbs";
import CoverImage from "@/components/CoverImage";
import JsonLd from "@/components/JsonLd";
import Lightbox from "@/components/Lightbox";
import PatternCard from "@/components/PatternCard";
import { PostGrid } from "@/components/PostCard";
import SubscribeForm from "@/components/SubscribeForm";
import YarnBall from "@/components/YarnBall";
import { getCategory, yarnVars } from "@/lib/categories";
import { getToc, markdownToText, readingTime, renderArticleWithBreak } from "@/lib/markdown";
import { getAllPublishedSlugs, getPostBySlug, getRelatedPosts } from "@/lib/posts";
import { absoluteUrl, getSiteSettings } from "@/lib/site";
import { formatDate } from "@/lib/utils";

export const revalidate = 300; // ISR: rebuild at most every 5 minutes

type Props = { params: Promise<{ slug: string }> };

/** Pre-build the newest posts; others are built on first visit and cached. */
export async function generateStaticParams() {
  const posts = await getAllPublishedSlugs();
  return posts.slice(0, 100).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post not found" };

  const site = await getSiteSettings();
  const title = post.seo_title || post.title;
  const description = post.seo_description || post.excerpt || markdownToText(post.content).slice(0, 155);
  const image = post.cover_url ? absoluteUrl(post.cover_url) : undefined;

  return {
    title: { absolute: post.seo_title ? post.seo_title : `${post.title} | ${site.name}` },
    description,
    keywords: post.tags,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      type: "article",
      url: `/blog/${post.slug}`,
      title,
      description,
      publishedTime: post.published_at ?? undefined,
      modifiedTime: post.updated_at,
      authors: [site.author],
      tags: post.tags,
      images: image ? [{ url: image, alt: post.cover_alt || post.title, width: 1000, height: 1250 }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const [category, site] = await Promise.all([getCategory(post.category), getSiteSettings()]);
  const hasPattern = post.pattern.trim().length > 0;
  const toc = getToc(post.content);
  const { first, second } = renderArticleWithBreak(post.content);
  const minutes = readingTime(post.content, post.pattern);
  const related = await getRelatedPosts(post.category, post.id);
  const etsyUrl = post.etsy_url || site.etsy;
  const url = absoluteUrl(`/blog/${post.slug}`);
  const image = post.cover_url ? absoluteUrl(post.cover_url) : undefined;
  const wasUpdated =
    post.published_at && new Date(post.updated_at).getTime() - new Date(post.published_at).getTime() > 86_400_000;

  const pinterestUrl =
    "https://www.pinterest.com/pin/create/button/?" +
    new URLSearchParams({ url, media: image ?? "", description: post.title }).toString();

  // ----- Structured data -----
  const author = { "@type": "Person", name: site.author, url: absoluteUrl("/about") };
  const structuredData: Record<string, unknown> = hasPattern
    ? {
        // Pattern posts → HowTo (supplies + tools + steps)
        "@context": "https://schema.org",
        "@type": "HowTo",
        name: post.title,
        description: post.excerpt,
        image,
        supply: post.materials
          .filter((m) => !/hook|needle|scissors|marker/i.test(m))
          .map((m) => ({ "@type": "HowToSupply", name: m })),
        tool: [
          ...(post.hook ? [{ "@type": "HowToTool", name: `Crochet hook ${post.hook}` }] : []),
          ...post.materials
            .filter((m) => /needle|scissors|marker/i.test(m))
            .map((m) => ({ "@type": "HowToTool", name: m })),
        ],
        step: post.pattern
          .split(/\n\s*\n/)
          .map((s) => markdownToText(s))
          .filter(Boolean)
          .map((text, i) => ({ "@type": "HowToStep", position: i + 1, text, url: `${url}#pattern` })),
        author,
        datePublished: post.published_at,
        dateModified: post.updated_at,
      }
    : {
        // Tutorials → BlogPosting
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: post.title,
        description: post.excerpt,
        image,
        author,
        publisher: { "@type": "Organization", name: site.name, url: absoluteUrl("/") },
        datePublished: post.published_at,
        dateModified: post.updated_at,
        mainEntityOfPage: url,
        keywords: post.tags.join(", "),
      };

  return (
    <article className="wrap" style={yarnVars(category?.color)}>
      <JsonLd data={structuredData} />
      {post.faq.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: post.faq.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }}
        />
      )}

      {/* 1. Category, title, summary, author, dates, reading time */}
      <header className="post-header read">
        <Breadcrumbs
          items={[
            ...(category ? [{ name: category.name, href: `/category/${category.slug}` }] : []),
            { name: post.title, href: `/blog/${post.slug}` },
          ]}
        />
        {category && (
          <Link className="chip" style={yarnVars(category.color)} href={`/category/${category.slug}`}>
            {category.name}
          </Link>
        )}
        <h1>{post.title}</h1>
        {post.excerpt && <p className="post-summary">{post.excerpt}</p>}
        <p className="post-meta">
          <span>
            By <strong>{site.author}</strong>
          </span>
          <span>
            Published <time dateTime={post.published_at ?? undefined}>{formatDate(post.published_at)}</time>
          </span>
          {wasUpdated && (
            <span>
              Updated <time dateTime={post.updated_at}>{formatDate(post.updated_at)}</time>
            </span>
          )}
          <span>{minutes} min read</span>
        </p>
      </header>

      {/* 2. Cover photo. Capped in CSS so it never fills a whole phone screen. */}
      {post.cover_url && (
        <div className="post-cover">
          <CoverImage
            src={post.cover_url}
            alt={post.cover_alt || post.title}
            sizes="(max-width: 760px) 100vw, 520px"
            priority
          />
        </div>
      )}

      {/* 3. Action buttons */}
      <div className="post-actions">
        {hasPattern && (
          <a className="btn btn-primary" href="#pattern">
            ↓ Jump to pattern
          </a>
        )}
        <a className="btn" href={etsyUrl} target="_blank" rel="noopener">
          Get the ad-free PDF
        </a>
        <a className="btn" href={pinterestUrl} target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M12 2a10 10 0 0 0-3.6 19.3c-.1-.8-.2-2 0-2.9l1.2-5s-.3-.6-.3-1.5c0-1.4.8-2.5 1.8-2.5.9 0 1.3.7 1.3 1.4 0 .9-.6 2.2-.8 3.4-.3 1 .5 1.9 1.5 1.9 1.8 0 3.2-1.9 3.2-4.7 0-2.5-1.8-4.2-4.3-4.2-2.9 0-4.6 2.2-4.6 4.4 0 .9.3 1.8.8 2.3l.1.4-.3 1.2c0 .2-.2.3-.4.2-1.3-.6-2.1-2.5-2.1-4 0-3.3 2.4-6.3 6.9-6.3 3.6 0 6.4 2.6 6.4 6 0 3.6-2.3 6.5-5.4 6.5-1.1 0-2.1-.6-2.4-1.2l-.7 2.5c-.2.9-.9 2.1-1.3 2.8A10 10 0 1 0 12 2z" />
          </svg>
          Save to Pinterest
        </a>
      </div>

      {/* On a wide screen this becomes two columns: the article and a sticky
          sign-up box. Below 1180px it collapses back to one column and the box
          simply lands at the end of the article — same element, no duplicate. */}
      <div className="post-layout">
        <div className="read">
        {/* 4. Compact table of contents: wrapping links, not a tall boxed list */}
        {toc.length > 1 && (
          <nav className="toc" aria-labelledby="toc-title">
            <h2 id="toc-title">In this post</h2>
            <ul>
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.text}</a>
                </li>
              ))}
              {hasPattern && (
                <li>
                  <a href="#pattern">The free pattern</a>
                </li>
              )}
              {post.faq.length > 0 && (
                <li>
                  <a href="#faq">FAQ</a>
                </li>
              )}
            </ul>
          </nav>
        )}

        {/* 5. Article, with one in-article ad in the middle */}
        <div className="prose" dangerouslySetInnerHTML={{ __html: first }} />
        {second && (
          <>
            <AdSlot
              format="in-article"
              client={site.adsEnabled ? site.adsenseClient : ""}
              slotDisplay={site.adsenseSlotDisplay}
              slotInArticle={site.adsenseSlotInArticle}
            />
            <div className="prose" dangerouslySetInnerHTML={{ __html: second }} />
          </>
        )}

        {/* 6. Pattern card (hidden for tutorials without instructions) */}
        {hasPattern && <PatternCard post={post} />}

        {/* 7. Etsy box */}
        <aside className="etsy-box">
          <YarnBall color="var(--yarn-peach)" size={72} />
          <div>
            <h2>Prefer paper? Get the ad-free PDF</h2>
            <p>A clean, printable version with no ads, larger charts and all the photos — and it supports more free patterns.</p>
          </div>
          <a className="btn btn-primary" href={etsyUrl} target="_blank" rel="noopener">
            Get it on Etsy
          </a>
        </aside>

        <AdSlot
          format="display"
          client={site.adsEnabled ? site.adsenseClient : ""}
          slotDisplay={site.adsenseSlotDisplay}
          slotInArticle={site.adsenseSlotInArticle}
        />

        {/* 8. FAQ accordion */}
        {post.faq.length > 0 && (
          <section className="faq" aria-labelledby="faq">
            <h2 id="faq">Frequently asked questions</h2>
            {post.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <div>
                  <p>{f.a}</p>
                </div>
              </details>
            ))}
          </section>
        )}
        </div>

        {/* 9. Email sign-up. Sticky beside the article on a wide screen, at the
            end of it on a narrow one — never a floating bar over the pattern. */}
        <aside className="post-aside">
          <AuthorBio />
          <SubscribeForm source={post.slug} />
        </aside>
      </div>

      {/* 10. Related posts */}
      {related.length > 0 && (
        <section className="related" aria-labelledby="related-title">
          <hr className="stitch" />
          <h2 id="related-title">More {category?.name.toLowerCase() ?? "patterns"} you’ll love</h2>
          <PostGrid posts={related} />
        </section>
      )}

      {/* Tap any step photo to see it full size. */}
      <Lightbox />
    </article>
  );
}
