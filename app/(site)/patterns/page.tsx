import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import { getPublishedProducts } from "@/lib/products";
import { siteOpenGraph } from "@/lib/site";
import "@/components/products/product.css";

export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  const products = await getPublishedProducts();
  return { title: "Digital Knitting & Crochet Patterns", description: "Explore digital PDF patterns and find the materials and techniques for your next handmade project.", alternates: { canonical: "/patterns" }, ...(products.length ? {} : { robots: { index: false, follow: false } }), openGraph: await siteOpenGraph({ url: "/patterns", title: "Digital Knitting & Crochet Patterns" }) };
}
export default async function PatternsPage() {
  const products = await getPublishedProducts();
  if (!products.length) notFound();
  return <div className="wrap"><header className="page-head"><Breadcrumbs items={[{ name: "PDF patterns", href: "/patterns" }]} /><h1>Digital knitting &amp; crochet patterns</h1><p>Explore the design, materials and techniques before choosing your next project.</p></header><div className="product-index-grid">{products.map(({ id, product }) => <Link key={id} className="product-index-card" href={`/patterns/${product.slug}`}><Image src={product.gallery[0].src} width={product.gallery[0].width} height={product.gallery[0].height} alt={product.gallery[0].alt} sizes="(max-width: 767px) 90vw, 360px" /><h2>{product.name}</h2><p>Digital PDF knitting pattern · {product.skillLevel}</p></Link>)}</div></div>;
}
