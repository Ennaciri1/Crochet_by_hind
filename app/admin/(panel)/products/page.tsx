import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/admin";
import { PRODUCT_TAG, type ProductRecord } from "@/lib/product-model";
import { productFromRecord } from "@/lib/products";

export const metadata: Metadata = { title: "Product landing pages" };

export default async function ProductsPage() {
  const supabase = await requireAdmin();
  const { data, error } = await supabase.from("posts").select("id, slug, title, content, status, published_at, updated_at, tags").contains("tags", [PRODUCT_TAG]).order("updated_at", { ascending: false });
  const products = ((data ?? []) as ProductRecord[]).map(productFromRecord).filter((item) => !!item);
  return <>
    <h1>Product landing pages</h1>
    <p className="muted">Review the page, confirm physical test-knitting, then publish the final edition. Drafts stay out of public navigation, search and the sitemap.</p>
    {error && <p className="notice notice-error">Products could not be loaded. Please try again.</p>}
    {!error && products.length === 0 && <p className="empty">No product drafts yet.</p>}
    {products.map((item) => <article className="panel product-admin-card" key={item.id}>
      <Image src={item.product.gallery[0].src} width={100} height={125} alt={item.product.gallery[0].alt} />
      <div><h2>{item.product.name}</h2><p><span className={`badge badge-${item.status}`}>{item.status === "published" ? "Published" : "Draft"}</span> · {item.product.validated ? "Test-knit confirmed" : "Awaiting physical test-knit"}</p><div className="button-row"><Link className="btn btn-small" href={`/admin/products/${item.id}`}>Edit product</Link><Link className="btn btn-small" href={`/admin/products/${item.id}/preview`} target="_blank">Private preview ↗</Link></div></div>
    </article>)}
  </>;
}
