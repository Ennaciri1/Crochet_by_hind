import Link from "next/link";
import { getPublishedProducts } from "@/lib/products";

/** Links appear only after validation/publication, never to a draft or 404. */
export default async function ProductRecommendations({ context }: { context: string }) {
  if (!/christmas|holiday|stocking|ornament|garland|wreath|gnome|home-decor/i.test(context)) return null;
  const products = await getPublishedProducts();
  if (!products.length) return null;
  return <aside className="product-recommendations" aria-label="Related PDF patterns"><p>Enjoy festive knitting too? {products.map(({ id, product }, index) => <span key={id}>{index > 0 && " · "}<Link href={`/patterns/${product.slug}`}>{product.name} knitting pattern</Link></span>)} — explore the design, materials and PDF details.</p></aside>;
}
