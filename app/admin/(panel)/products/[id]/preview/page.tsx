import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import ProductLanding from "@/components/products/ProductLanding";
import { requireAdmin } from "@/lib/admin";
import { UUID_PATTERN } from "@/lib/community";
import { PRODUCT_TAG, productMetadata, type ProductRecord } from "@/lib/product-model";
import { productFromRecord } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

const loadPreview = cache(async (id: string) => {
  if (!UUID_PATTERN.test(id)) notFound();
  const supabase = await requireAdmin();
  const { data } = await supabase.from("posts").select("id, slug, title, content, status, published_at, updated_at, tags").eq("id", id).contains("tags", [PRODUCT_TAG]).maybeSingle();
  const item = data ? productFromRecord(data as ProductRecord) : null;
  if (!item) notFound();
  return item;
});

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const item = await loadPreview((await params).id);
  return productMetadata(item.product, SITE_URL, true);
}

export default async function ProductPreview({ params }: { params: Promise<{ id: string }> }) {
  const item = await loadPreview((await params).id);
  return <ProductLanding product={item.product} preview />;
}
