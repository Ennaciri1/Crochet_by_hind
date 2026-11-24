import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ProductLanding from "@/components/products/ProductLanding";
import { HEARTHSIDE_SLUG, productMetadata } from "@/lib/product-model";
import { defaultProduct, getPublishedProduct, getPublishedProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

export const revalidate = 300;
export const dynamic = "force-static";
type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPublishedProducts()).map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const item = await getPublishedProduct(slug);
  if (item) return productMetadata(item.product, SITE_URL);
  if (process.env.NODE_ENV === "development" && process.env.PRODUCT_LOCAL_PREVIEW === "true" && slug === HEARTHSIDE_SLUG) return productMetadata(defaultProduct, SITE_URL, true);
  return { title: "Pattern not published", robots: { index: false, follow: false } };
}

export default async function PatternPage({ params }: Props) {
  const { slug } = await params;
  const item = await getPublishedProduct(slug);
  if (item) return <ProductLanding product={item.product} />;
  // Opt-in local visual QA only. Production always requires a published,
  // physically validated record, or the separate authenticated admin preview.
  if (process.env.NODE_ENV === "development" && process.env.PRODUCT_LOCAL_PREVIEW === "true" && slug === HEARTHSIDE_SLUG) return <ProductLanding product={defaultProduct} preview />;
  notFound();
}
