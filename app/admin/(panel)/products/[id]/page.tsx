import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { UUID_PATTERN } from "@/lib/community";
import { PRODUCT_TAG, type ProductRecord } from "@/lib/product-model";
import { productFromRecord } from "@/lib/products";
import contentPlan from "@/data/products/hearthside-shelf-gnome.content-plan.json";
import ProductForm from "../ProductForm";

export const metadata: Metadata = { title: "Edit product" };
export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_PATTERN.test(id)) notFound();
  const supabase = await requireAdmin();
  const { data } = await supabase.from("posts").select("id, slug, title, content, status, published_at, updated_at, tags").eq("id", id).contains("tags", [PRODUCT_TAG]).maybeSingle();
  const item = data ? productFromRecord(data as ProductRecord) : null;
  if (!item) notFound();
  return <>
    <h1>Edit {item.product.name}</h1>
    <p><a href={`/admin/products/${id}/preview`} target="_blank" rel="noopener">Open private page preview ↗</a></p>
    <p className="notice notice-ok"><strong>Source review:</strong> {item.product.sourceNote}</p>
    <ProductForm id={id} product={item.product} status={item.status} />
    <details className="panel product-content-plan"><summary>Supporting SEO content plan — three useful articles</summary><p>Plan only. Publish original supporting content after the product is validated.</p>{contentPlan.articles.map((article) => <section key={article.proposedSlug}><h2>{article.title}</h2><p>{article.intent}</p><ol>{article.outline.map((step) => <li key={step}>{step}</li>)}</ol><p><strong>Original value:</strong> {article.originalValue}</p></section>)}</details>
  </>;
}
