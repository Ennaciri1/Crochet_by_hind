import type { Metadata } from "next";
import { getCategories } from "@/lib/categories";
import CategoryListing, { categoryMetadata } from "./listing";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return categoryMetadata(slug, 1);
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  return <CategoryListing slug={slug} page={1} />;
}
