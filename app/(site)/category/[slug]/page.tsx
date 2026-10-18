import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "@/components/AdSlot";
import Breadcrumbs from "@/components/Breadcrumbs";
import { CategoryPills } from "@/components/CategoryNav";
import { PostGrid } from "@/components/PostCard";
import YarnBall from "@/components/YarnBall";
import { categories, getCategory, yarnVars } from "@/lib/categories";
import { getPostsByCategory } from "@/lib/posts";

export const revalidate = 300;
export const dynamicParams = false; // only the 5 known categories exist

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return {};
  const title = slug === "free-patterns" ? "Free Crochet Patterns" : `${category.name} Crochet Patterns`;
  return {
    title,
    description: category.description,
    alternates: { canonical: `/category/${slug}` },
    openGraph: { url: `/category/${slug}`, title, description: category.description },
  };
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  const posts = await getPostsByCategory(slug);

  return (
    <div className="wrap">
      <header className="page-head category-head" style={yarnVars(category.color)}>
        <Breadcrumbs items={[{ name: category.name, href: `/category/${slug}` }]} />
        <div className="category-head-row">
          <div>
            <h1>{category.name}</h1>
            <p>{category.description}</p>
          </div>
          <YarnBall color="var(--c)" size={120} className="category-head-ball" />
        </div>
        <CategoryPills current={slug} />
      </header>

      <hr className="stitch" />

      {posts.length > 0 ? (
        <>
          <PostGrid posts={posts.slice(0, 6)} />
          {posts.length > 6 && (
            <>
              <AdSlot format="display" />
              <PostGrid posts={posts.slice(6)} />
            </>
          )}
        </>
      ) : (
        <p className="empty">No patterns in this category yet. Come back soon!</p>
      )}
    </div>
  );
}
