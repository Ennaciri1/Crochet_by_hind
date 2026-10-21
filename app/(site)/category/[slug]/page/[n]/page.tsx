import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/categories";
import { getPostsPage, POSTS_PER_PAGE } from "@/lib/posts";
import CategoryListing, { categoryMetadata } from "../../listing";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string; n: string }> };

/** Pre-build page 2 and beyond for every category that has them. */
export async function generateStaticParams() {
  const categories = await getCategories();
  const params: { slug: string; n: string }[] = [];

  for (const category of categories) {
    const { total } = await getPostsPage({ category: category.slug, perPage: POSTS_PER_PAGE });
    const pages = Math.ceil(total / POSTS_PER_PAGE);
    for (let n = 2; n <= pages; n += 1) params.push({ slug: category.slug, n: String(n) });
  }

  return params;
}

function pageNumber(raw: string) {
  // Only a plain integer is a page: "/page/02" and "/page/abc" are not pages.
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  return Number(raw);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, n } = await params;
  const page = pageNumber(n);
  if (!page) return {};
  return categoryMetadata(slug, page);
}

export default async function CategoryPageN({ params }: Props) {
  const { slug, n } = await params;
  const page = pageNumber(n);
  // Page 1 has its own URL (/category/[slug]); this route starts at 2.
  if (!page || page < 2) notFound();
  return <CategoryListing slug={slug} page={page} />;
}
