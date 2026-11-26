import CoverImage from "@/components/CoverImage";
import type { ShopProduct } from "@/lib/fourthwall";

export default function FourthwallProducts({ products }: { products: ShopProduct[] }) {
  return (
    <ul className="post-grid">
      {products.map((product) => (
        <li key={product.href}>
          <article className="card">
            <a className="card-link" href={product.href}>
              {product.image && (
                <div className="media">
                  <CoverImage
                    src={product.image}
                    alt=""
                    sizes="(max-width: 359px) 92vw, (max-width: 1023px) 47vw, 380px"
                    quality={75}
                  />
                </div>
              )}
              <div className="card-body">
                {product.price && <span className="card-cat">{product.price}</span>}
                <h3>{product.name}</h3>
                <p>View on Fourthwall</p>
              </div>
            </a>
          </article>
        </li>
      ))}
    </ul>
  );
}
