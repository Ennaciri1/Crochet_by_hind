import { cache } from "react";
import seed from "@/data/products/hearthside-shelf-gnome.json";
import { getPublicClient } from "./supabase/public";
import { PRODUCT_TAG, parseProductContent, isPublishedProduct, type ProductPageData, type ProductRecord } from "./product-model";

export const defaultProduct = parseProductContent(JSON.stringify(seed))!;

export function productFromRecord(record: ProductRecord): ProductPageData | null {
  const product = parseProductContent(record.content);
  if (!product || record.slug !== product.slug || !record.tags.includes(PRODUCT_TAG)) return null;
  return { ...record, product };
}

/** Uses the existing posts table and RLS; no database migration or secret key. */
export const getPublishedProducts = cache(async (): Promise<ProductPageData[]> => {
  const supabase = getPublicClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("posts")
    .select("id, slug, title, content, status, published_at, updated_at, tags")
    .contains("tags", [PRODUCT_TAG]).eq("status", "published")
    .lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(100);
  if (error) { console.error("products:", error.code); return []; }
  return ((data ?? []) as ProductRecord[]).map(productFromRecord).filter((record): record is ProductPageData => !!record && isPublishedProduct(record));
});

export const getPublishedProduct = cache(async (slug: string) => (await getPublishedProducts()).find((item) => item.slug === slug) ?? null);
