import type { Metadata } from "next";
import type { FaqItem } from "./types";
import { supabaseImageHost } from "./images";

export const PRODUCT_TAG = "product-landing";
export const HEARTHSIDE_SLUG = "christmas-gnome-knitting-pattern";
export const HEARTHSIDE_ETSY_URL = "https://www.etsy.com/listing/4624278832/christmas-gnome-knitting-pattern-pdf";

export type ProductImage = { src: string; width: number; height: number; alt: string; caption: string };
export type ProductContent = {
  version: 1; sku: string; slug: string; brand: string; name: string; headline: string; intro: string;
  seoTitle: string; seoDescription: string; etsyUrl: string; pdfPages: number; language: string;
  terminology: string; skillLevel: string; yarn: string; needles: string; validated: boolean;
  validatedAt: string | null; sourceNote: string; gallery: ProductImage[]; decorImage: ProductImage;
  pinImage: ProductImage; video: { src: string; poster: string; width: number; height: number; duration: number };
  pinterestTitle: string; pinterestDescription: string; story: string; included: string[];
  materials: string[]; skills: string; decorating: string; faq: FaqItem[]; closing: string;
};
export type ProductRecord = {
  id: string; slug: string; title: string; content: string; status: "draft" | "published";
  published_at: string | null; updated_at: string; tags: string[];
};
export type ProductPageData = ProductRecord & { product: ProductContent };

export function isProductMediaUrl(src: unknown): src is string {
  if (typeof src !== "string") return false;
  if (src.startsWith("/images/products/") && !src.includes("..")) return true;
  try {
    const url = new URL(src);
    return url.protocol === "https:" && url.hostname === supabaseImageHost() && url.pathname.startsWith("/storage/v1/object/public/images/");
  } catch { return false; }
}

function isImage(value: unknown): value is ProductImage {
  if (!value || typeof value !== "object") return false;
  const image = value as ProductImage;
  return isProductMediaUrl(image.src) && typeof image.alt === "string" && !!image.alt.trim()
    && typeof image.caption === "string" && Number.isInteger(image.width) && image.width > 0
    && Number.isInteger(image.height) && image.height > 0;
}

export function parseProductContent(content: string): ProductContent | null {
  try {
    const data = JSON.parse(content) as ProductContent;
    const strings = ["sku", "slug", "brand", "name", "headline", "intro", "seoTitle", "seoDescription", "etsyUrl", "language", "terminology", "skillLevel", "yarn", "needles", "sourceNote", "pinterestTitle", "pinterestDescription", "story", "skills", "decorating", "closing"] as const;
    if (!data || data.version !== 1 || strings.some((key) => typeof data[key] !== "string" || !data[key].trim())) return null;
    if (data.slug !== HEARTHSIDE_SLUG || data.etsyUrl !== HEARTHSIDE_ETSY_URL) return null;
    if (!Number.isInteger(data.pdfPages) || data.pdfPages < 1 || data.pdfPages > 300 || typeof data.validated !== "boolean") return null;
    if (data.validatedAt !== null && (typeof data.validatedAt !== "string" || !Number.isFinite(Date.parse(data.validatedAt)))) return null;
    if (!Array.isArray(data.gallery) || data.gallery.length !== 6 || !data.gallery.every(isImage) || !isImage(data.pinImage) || !isImage(data.decorImage)) return null;
    if (Math.abs(data.pinImage.width / data.pinImage.height - 2 / 3) > 0.001) return null;
    if (![data.included, data.materials].every((list) => Array.isArray(list) && list.length > 0 && list.every((value) => typeof value === "string" && value.trim()))) return null;
    if (!Array.isArray(data.faq) || !data.faq.length || !data.faq.every((item) => typeof item.q === "string" && !!item.q.trim() && typeof item.a === "string" && !!item.a.trim())) return null;
    if (!data.video || !isProductMediaUrl(data.video.src) || !isProductMediaUrl(data.video.poster)
      || !Number.isInteger(data.video.width) || !Number.isInteger(data.video.height)
      || !Number.isFinite(data.video.duration) || !(data.video.width > 0 && data.video.height > 0 && data.video.duration > 0)) return null;
    return data;
  } catch { return null; }
}

export function canPublishProduct(product: ProductContent): boolean {
  return product.validated && !!product.validatedAt && Date.parse(product.validatedAt) <= Date.now();
}

export function isPublishedProduct(record: ProductPageData): boolean {
  return record.status === "published" && record.tags.includes(PRODUCT_TAG) && !!record.published_at
    && Date.parse(record.published_at) <= Date.now() && canPublishProduct(record.product);
}

export function productFaq(product: ProductContent): FaqItem[] {
  return product.faq.map((item) => ({ ...item, a: item.a.replaceAll("{pages}", String(product.pdfPages)).replaceAll("{validation}", product.validated
    ? "The designer has confirmed physical test-knitting and reviewed this edition."
    : "No. This draft has not yet been physically test-knit and is being held back from publication.") }));
}

export function productMetadata(product: ProductContent, origin: string, preview = false): Metadata {
  const url = `${origin}/patterns/${product.slug}`;
  const image = new URL(product.gallery[0].src, origin).href;
  return {
    title: { absolute: product.seoTitle }, description: product.seoDescription,
    alternates: { canonical: url }, robots: { index: !preview, follow: !preview, googleBot: { index: !preview, follow: !preview, "max-image-preview": "large" } },
    openGraph: { type: "website", title: product.seoTitle, description: product.seoDescription, url, siteName: product.brand,
      locale: "en_US", alternateLocale: ["en_GB", "en_CA", "en_AU"], images: [{ url: image, width: product.gallery[0].width, height: product.gallery[0].height, alt: product.gallery[0].alt }] },
    twitter: { card: "summary_large_image", title: product.seoTitle, description: product.seoDescription, images: [image] },
  };
}

export function productStructuredData(product: ProductContent, origin: string) {
  const url = `${origin}/patterns/${product.slug}`;
  return {
    "@context": "https://schema.org", "@type": "Product", "@id": `${url}#product`,
    name: product.name, description: product.seoDescription, url, sku: product.sku,
    brand: { "@type": "Brand", name: product.brand }, category: "Digital PDF knitting patterns",
    image: product.gallery.map((image) => new URL(image.src, origin).href), sameAs: product.etsyUrl,
    additionalProperty: [
      ["Format", "Digital PDF knitting pattern"], ["Pages", product.pdfPages], ["Language", product.language],
      ["Terminology", product.terminology], ["Skill level", product.skillLevel], ["Project yarn", product.yarn],
      ["Knitting needles", product.needles], ["Design images", "Generated illustrations"],
    ].map(([name, value]) => ({ "@type": "PropertyValue", name, value })),
  };
}

export function pinterestUrl(product: ProductContent, origin: string): string {
  return "https://www.pinterest.com/pin/create/button/?" + new URLSearchParams({
    url: `${origin}/patterns/${product.slug}`, media: new URL(product.pinImage.src, origin).href,
    description: `${product.pinterestTitle}\n\n${product.pinterestDescription}`,
  }).toString();
}
