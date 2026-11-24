"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin";
import { UUID_PATTERN } from "@/lib/community";
import { PRODUCT_TAG, parseProductContent, canPublishProduct } from "@/lib/product-model";

export type ProductSaveState = { ok?: boolean; message?: string; error?: string } | null;

export async function saveProduct(_previous: ProductSaveState, form: FormData): Promise<ProductSaveState> {
  const supabase = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const intent = String(form.get("intent") ?? "draft");
  if (!UUID_PATTERN.test(id) || !["draft", "publish"].includes(intent)) return { error: "Invalid product." };
  const { data: current, error: readError } = await supabase.from("posts").select("id, slug, content, published_at, tags").eq("id", id).contains("tags", [PRODUCT_TAG]).maybeSingle();
  const previous = current ? parseProductContent(current.content) : null;
  if (readError || !current || !previous) return { error: "This product could not be loaded." };
  const raw = String(form.get("product") ?? "");
  if (raw.length > 100000) return { error: "The product description is too long." };
  let normalized = raw;
  try {
    const fields = JSON.parse(raw);
    for (const key of ["included", "materials"]) if (Array.isArray(fields[key])) fields[key] = fields[key].map((value: unknown) => typeof value === "string" ? value.trim() : value).filter(Boolean);
    normalized = JSON.stringify(fields);
  } catch { return { error: "The product details could not be read." }; }
  const product = parseProductContent(normalized);
  if (!product) return { error: "Check the product details, six gallery images, and the 2:3 Pinterest image." };
  // Identity and the exact Etsy destination are set by the saved product, never by form input.
  product.slug = previous.slug; product.sku = previous.sku; product.etsyUrl = previous.etsyUrl; product.brand = previous.brand;
  product.validated = form.get("test_knit_confirmed") === "on";
  product.validatedAt = product.validated ? previous.validatedAt || new Date().toISOString() : null;
  if (intent === "publish" && !canPublishProduct(product)) {
    return { error: "Keep this as a draft until the pattern has been physically test-knit, corrected and the final PDF details reviewed." };
  }
  const { error } = await supabase.from("posts").update({
    title: product.headline, excerpt: product.intro, content: JSON.stringify(product),
    cover_url: product.gallery[0].src, cover_alt: product.gallery[0].alt,
    yarn: product.yarn, hook: product.needles, etsy_url: product.etsyUrl,
    seo_title: product.seoTitle, seo_description: product.seoDescription,
    status: intent === "publish" ? "published" : "draft",
    published_at: intent === "publish" ? current.published_at || new Date().toISOString() : null,
  }).eq("id", id).contains("tags", [PRODUCT_TAG]);
  if (error) return { error: "The product could not be saved. Please try again." };
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  revalidatePath("/patterns");
  revalidatePath(`/patterns/${product.slug}`);
  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${id}`);
  revalidatePath(`/admin/products/${id}/preview`);
  return { ok: true, message: intent === "publish" ? "The validated product is published." : "Draft saved. The product is not publicly available or listed in the sitemap." };
}
