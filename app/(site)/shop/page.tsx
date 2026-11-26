import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import FourthwallProducts from "@/components/FourthwallProducts";
import { getFourthwallProducts, getFourthwallShopUrl } from "@/lib/fourthwall";

export const metadata: Metadata = {
  title: "Shop",
  description: "Explore the Crochet by Hind catalog and shop on Fourthwall.",
  alternates: { canonical: "/shop" },
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ page?: string | string[] }> }) {
  const shop = getFourthwallShopUrl();
  if (!shop) notFound();
  const { page: rawPage } = await searchParams;
  const page = typeof rawPage === "string" && /^[1-9]\d{0,3}$/.test(rawPage) ? Number(rawPage) : 1;
  const { products, hasNext, unavailable } = await getFourthwallProducts(page);
  if (!unavailable && page > 1 && !products.length) notFound();

  return (
    <div className="wrap">
      <header className="page-head">
        <h1>Shop Crochet by Hind</h1>
        <p>Browse the catalog and open a product on Fourthwall for details and checkout.</p>
      </header>
      {products.length ? (
        <FourthwallProducts products={products} />
      ) : (
        <p className="empty">{unavailable ? "The catalog is temporarily unavailable." : "No products are listed yet."}</p>
      )}
      {!unavailable && (page > 1 || hasNext) && (
        <nav className="pagination" aria-label="Shop pages">
          {page > 1 && <Link className="page-step" href={page === 2 ? "/shop" : `/shop?page=${page - 1}`}>Previous</Link>}
          {hasNext && <Link className="page-step" href={`/shop?page=${page + 1}`}>Next</Link>}
        </nav>
      )}
      <p style={{ marginBlock: "2rem" }}><a className="btn" href={shop}>Visit the Fourthwall shop</a></p>
    </div>
  );
}
