import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPostsPage, POSTS_PER_PAGE } from "@/lib/posts";
import BlogListing, { blogMetadata } from "../../listing";

/** /blog/page/2, /blog/page/3… — older posts. Page 1 is /blog itself. */
export const revalidate = 300;

type Props = { params: Promise<{ n: string }> };

/** Pre-build every page that exists today; a new one is built on first visit. */
export async function generateStaticParams() {
  const { total } = await getPostsPage({ perPage: POSTS_PER_PAGE });
  const pages = Math.ceil(total / POSTS_PER_PAGE);
  const params: { n: string }[] = [];
  for (let n = 2; n <= pages; n += 1) params.push({ n: String(n) });
  return params;
}

function pageNumber(raw: string) {
  // Only a plain integer is a page: "/page/02" and "/page/abc" are not pages.
  if (!/^[1-9][0-9]*$/.test(raw)) return null;
  return Number(raw);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = pageNumber((await params).n);
  return page ? blogMetadata(page) : {};
}

export default async function BlogPageN({ params }: Props) {
  const page = pageNumber((await params).n);
  if (!page || page < 2) notFound();
  return <BlogListing page={page} />;
}
