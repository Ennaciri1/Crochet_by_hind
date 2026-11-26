import "server-only";

const PAGE_SIZE = 24;
const CATALOG_URL = "https://storefront-api.fourthwall.com/v1/collections/all/products";
const FOURTHWALL_IMAGE_HOST = "imgproxy.fourthwall.dev";

type StorefrontProduct = {
  name: string;
  slug: string;
  access?: { type?: string };
  images?: { url?: string }[];
  variants?: { unitPrice?: { value?: number; currency?: string } }[];
};

export type ShopProduct = {
  name: string;
  href: string;
  image: string | null;
  price: string | null;
};

export function getFourthwallShopUrl() {
  const host = process.env.NEXT_PUBLIC_FOURTHWALL_SHOP?.trim().toLowerCase();
  return host && /^[a-z0-9][a-z0-9-]*\.fourthwall\.com$/.test(host)
    ? `https://${host}`
    : null;
}

function productImage(images: StorefrontProduct["images"]) {
  for (const image of images ?? []) {
    if (!image.url) continue;
    try {
      const url = new URL(image.url);
      if (url.protocol === "https:" && url.host === FOURTHWALL_IMAGE_HOST &&
          !url.username && !url.password && !url.search && !url.hash) return url.href;
    } catch {
      // A missing or invalid thumbnail should not hide the product.
    }
  }
  return null;
}

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function productPrice(variants: StorefrontProduct["variants"]) {
  const prices = (variants ?? []).flatMap(({ unitPrice }) => {
    const value = unitPrice?.value;
    return unitPrice?.currency === "USD" && typeof value === "number" && Number.isFinite(value) && value >= 0
      ? [value]
      : [];
  });
  if (prices.length === 0) return null;
  const lowest = Math.min(...prices);
  const text = `${usd.format(lowest)} USD`;
  return prices.some((price) => price !== lowest) ? `From ${text}` : text;
}

export async function getFourthwallProducts(page = 1): Promise<{
  products: ShopProduct[];
  hasNext: boolean;
  unavailable: boolean;
}> {
  const shop = getFourthwallShopUrl();
  const token = process.env.FOURTHWALL_STOREFRONT_TOKEN?.trim();
  const empty = { products: [], hasNext: false, unavailable: true };
  if (!shop || !token) return empty;

  const url = new URL(CATALOG_URL);
  url.search = new URLSearchParams({
    storefront_token: token,
    currency: "USD",
    page: String(page - 1),
    size: String(PAGE_SIZE),
  }).toString();
  try {
    const response = await fetch(url, {
      next: { revalidate: 300 },
      redirect: "error",
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) {
      console.warn("Fourthwall catalog request failed", response.status);
      return empty;
    }
    const data: { results?: StorefrontProduct[]; paging?: { hasNextPage?: boolean } } = await response.json();
    if (!Array.isArray(data.results)) return empty;

    const products = data.results.flatMap((product) => {
      if (product?.access?.type !== "PUBLIC" || typeof product.name !== "string" ||
          !product.name.trim() || typeof product.slug !== "string" || !/^[a-z0-9-]+$/.test(product.slug)) return [];
      return [{
        name: product.name,
        href: `${shop}/products/${product.slug}`,
        image: productImage(product.images),
        price: productPrice(product.variants),
      }];
    });
    return { products, hasNext: data.paging?.hasNextPage === true, unavailable: false };
  } catch {
    // The request URL contains the token. Keep it out of diagnostics.
    console.warn("Fourthwall catalog is temporarily unavailable");
    return empty;
  }
}
