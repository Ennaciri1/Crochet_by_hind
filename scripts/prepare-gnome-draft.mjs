// Creates a separate import file; never changes existing import/posts.json.
import { readFile, writeFile, mkdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const product = JSON.parse(await readFile(new URL("data/products/hearthside-shelf-gnome.json", root), "utf8"));
product.validated = false; product.validatedAt = null;
const row = {
  slug: product.slug, title: product.headline, excerpt: product.intro, content: JSON.stringify(product),
  cover_url: product.gallery[0].src, cover_alt: product.gallery[0].alt, category: "home-decor",
  tags: ["product-landing", "knitting", "christmas", "shelf-sitter"], difficulty: "intermediate",
  yarn: product.yarn, hook: product.needles, materials: product.materials, etsy_url: product.etsyUrl,
  seo_title: product.seoTitle, seo_description: product.seoDescription, status: "draft", published_at: null,
};
await mkdir(new URL("import/", root), { recursive: true });
await writeFile(new URL("import/hearthside-shelf-gnome-posts.json", root), JSON.stringify([row], null, 2));
console.log("Prepared import/hearthside-shelf-gnome-posts.json — draft only, physical validation not confirmed.");
