"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { difficulties, getCategories } from "@/lib/categories";
import { slugify } from "@/lib/markdown";
import type { StaticPageSlug } from "@/lib/pages";
import {
  capText,
  LIMITS,
  normalizeDifficulty,
  normalizeStatus,
  parsePublishDate,
  parseTags,
} from "@/lib/post-fields";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseFaq } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Returns a Supabase client for the logged-in admin, or redirects to login. */
async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) throw new Error("This account is not an admin.");
  return supabase;
}

/** After any change, refresh every public page (home, categories, posts, sitemap). */
function refreshPublicPages() {
  revalidatePath("/", "layout");
  // Metadata routes sit outside the layout tree, so they need purging by name:
  // without this an unpublished post lingers in the sitemap until it expires.
  revalidatePath("/sitemap.xml");
  revalidatePath("/robots.txt");
}

const text = (formData: FormData, key: string, max = 20000) => String(formData.get(key) ?? "").trim().slice(0, max);

/* ------------------------------------------------------------------ */
/* Login / logout                                                      */
/* ------------------------------------------------------------------ */

export type FormState = { error?: string; ok?: boolean } | null;

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = text(formData, "email", 200);
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Please enter your email and password." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Wrong email or password." };

  redirect("/admin");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* ------------------------------------------------------------------ */
/* Posts                                                               */
/* ------------------------------------------------------------------ */

export async function savePost(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await requireAdmin();

  const id = text(formData, "id", 64);
  const intent = text(formData, "intent", 20); // "publish" | "draft" | "unpublish"
  const title = text(formData, "title", 200);
  const slug = slugify(text(formData, "slug", 120) || title);

  if (!title) return { error: "The title is required." };
  if (!slug) return { error: "The URL slug is required." };

  const category = text(formData, "category", 40);
  const categories = await getCategories();
  const difficulty = text(formData, "difficulty", 20);
  const publishedAtInput = text(formData, "published_at", 40);

  // Status and date
  const status = intent === "publish" ? "published" : "draft";
  let published_at: string | null = publishedAtInput ? new Date(publishedAtInput).toISOString() : null;
  if (intent === "publish" && !published_at) published_at = new Date().toISOString();

  const lines = (value: string) =>
    value
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const post = {
    title,
    slug,
    excerpt: text(formData, "excerpt", 500),
    content: text(formData, "content", 200000),
    cover_url: text(formData, "cover_url", 1000) || null,
    cover_alt: text(formData, "cover_alt", 300),
    category: categories.some((c) => c.slug === category) ? category : "free-patterns",
    tags: text(formData, "tags", 1000)
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 20),
    difficulty: (difficulties as readonly string[]).includes(difficulty) ? difficulty : null,
    yarn: text(formData, "yarn", 500),
    hook: text(formData, "hook", 200),
    gauge: text(formData, "gauge", 300),
    finished_size: text(formData, "finished_size", 300),
    time_estimate: text(formData, "time_estimate", 100),
    materials: lines(text(formData, "materials", 5000)),
    abbreviations: text(formData, "abbreviations", 5000),
    pattern: text(formData, "pattern", 100000),
    faq: parseFaq(text(formData, "faq", 20000)),
    etsy_url: text(formData, "etsy_url", 1000),
    seo_title: text(formData, "seo_title", 120),
    seo_description: text(formData, "seo_description", 300),
    status,
    published_at,
  };

  let postId = id;
  if (id) {
    const { error } = await supabase.from("posts").update(post).eq("id", id);
    if (error) return { error: friendlyError(error.code, error.message) };
  } else {
    const { data, error } = await supabase.from("posts").insert(post).select("id").single();
    if (error) return { error: friendlyError(error.code, error.message) };
    postId = data.id;
  }

  refreshPublicPages();
  redirect(`/admin/posts/${postId}?saved=${intent}`);
}

export async function deletePost(formData: FormData) {
  const supabase = await requireAdmin();
  const id = text(formData, "id", 64);
  if (id) await supabase.from("posts").delete().eq("id", id);
  refreshPublicPages();
  redirect("/admin?deleted=1");
}

function friendlyError(code: string | undefined, message: string) {
  if (code === "23505") return "Another post already uses this URL slug. Please choose a different one.";
  return `Could not save: ${message}`;
}

/* ------------------------------------------------------------------ */
/* Bulk import (Excel + photos)                                        */
/* ------------------------------------------------------------------ */

/**
 * One post to create. In-article photos are NOT a field: they are already inside
 * `content` as Markdown images, uploaded by the browser just like `cover_url`.
 */
export type ImportRow = {
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  cover_url?: string | null;
  cover_alt?: string;
  category?: string;
  tags?: string[];
  difficulty?: string | null;
  yarn?: string;
  hook?: string;
  gauge?: string;
  finished_size?: string;
  time_estimate?: string;
  materials?: string[];
  abbreviations?: string;
  pattern?: string;
  faq?: { q: string; a: string }[];
  etsy_url?: string;
  seo_title?: string;
  seo_description?: string;
  status?: string;
  published_at?: string;
  /** Spreadsheet row number, echoed back so the preview and the result can be lined up. */
  row_number?: number;
};

export type ImportResult = {
  title: string;
  ok: boolean;
  kind: "created" | "skipped" | "failed";
  error?: string;
  slug?: string;
  id?: string;
  rowNumber?: number;
  /** Set when the post was created but its photos could not be uploaded. */
  withoutCover?: boolean;
};

const MAX_IMPORT_ROWS = 200;

/** The slugs already taken, so the importer can warn about duplicates before anything is written. */
export async function getExistingSlugs(): Promise<string[]> {
  const supabase = await requireAdmin();
  const { data } = await supabase.from("posts").select("slug");
  return (data ?? []).map((p) => String(p.slug));
}

/** Bulk-creates posts from already-parsed rows (photos already uploaded client-side). */
export async function importPosts(
  rows: ImportRow[],
  options?: { onDuplicate?: "skip" | "suffix" }
): Promise<{ results: ImportResult[] }> {
  const supabase = await requireAdmin();

  if (!Array.isArray(rows) || rows.length === 0) return { results: [] };
  const limited = rows.slice(0, MAX_IMPORT_ROWS);
  const onDuplicate = options?.onDuplicate === "suffix" ? "suffix" : "skip";

  const categories = await getCategories();
  const { data: existing } = await supabase.from("posts").select("slug");
  const usedSlugs = new Set((existing ?? []).map((p) => p.slug as string));
  // Guards against a double-create when the browser retries a timed-out call.
  const createdThisRun = new Set<string>();

  const results: ImportResult[] = [];

  for (const row of limited) {
    const rowNumber = typeof row.row_number === "number" ? row.row_number : undefined;
    const title = capText(row.title, LIMITS.title);
    if (!title) {
      results.push({ title: "(untitled row)", ok: false, kind: "skipped", error: "The title is empty.", rowNumber });
      continue;
    }

    const baseSlug = slugify(capText(row.slug, LIMITS.slug) || title);
    if (!baseSlug) {
      results.push({
        title,
        ok: false,
        kind: "failed",
        error: "Could not build a URL slug from this title.",
        rowNumber,
      });
      continue;
    }

    if (createdThisRun.has(baseSlug)) {
      results.push({
        title,
        ok: false,
        kind: "skipped",
        error: "This URL was already created by this import.",
        slug: baseSlug,
        rowNumber,
      });
      continue;
    }

    let slug = baseSlug;
    if (usedSlugs.has(slug)) {
      if (onDuplicate === "skip") {
        results.push({
          title,
          ok: false,
          kind: "skipped",
          error: `A post already uses /blog/${slug}.`,
          slug,
          rowNumber,
        });
        continue;
      }
      let n = 2;
      while (usedSlugs.has(slug)) {
        slug = `${baseSlug}-${n}`;
        n += 1;
      }
    }

    const categorySlug = capText(row.category, 40).toLowerCase();
    const category = categories.some((c) => c.slug.toLowerCase() === categorySlug) ? categorySlug : "free-patterns";

    const status = normalizeStatus(row.status).value;
    // Same rule as savePost: an explicit date wins (a future one schedules the post),
    // otherwise publishing stamps now and a draft keeps no date.
    const { iso } = parsePublishDate(row.published_at ?? "");
    const published_at = iso ?? (status === "published" ? new Date().toISOString() : null);

    const faq = (Array.isArray(row.faq) ? row.faq : [])
      .map((item) => ({ q: capText(item?.q, LIMITS.FAQ_Q), a: capText(item?.a, LIMITS.FAQ_A) }))
      .filter((item) => item.q && item.a)
      .slice(0, LIMITS.MAX_FAQ);

    const post = {
      title,
      slug,
      excerpt: capText(row.excerpt, LIMITS.excerpt),
      content: capText(row.content, LIMITS.content),
      cover_url: capText(row.cover_url, LIMITS.cover_url) || null,
      cover_alt: capText(row.cover_alt, LIMITS.cover_alt) || title,
      category,
      tags: parseTags((row.tags ?? []).join(",")).tags,
      difficulty: normalizeDifficulty(row.difficulty).value,
      yarn: capText(row.yarn, LIMITS.yarn),
      hook: capText(row.hook, LIMITS.hook),
      gauge: capText(row.gauge, LIMITS.gauge),
      finished_size: capText(row.finished_size, LIMITS.finished_size),
      time_estimate: capText(row.time_estimate, LIMITS.time_estimate),
      materials: (Array.isArray(row.materials) ? row.materials : [])
        .map((m) => capText(m, LIMITS.MATERIAL_ITEM))
        .filter(Boolean)
        .slice(0, LIMITS.MAX_MATERIALS),
      abbreviations: capText(row.abbreviations, LIMITS.abbreviations),
      pattern: capText(row.pattern, LIMITS.pattern),
      faq,
      etsy_url: capText(row.etsy_url, LIMITS.etsy_url),
      seo_title: capText(row.seo_title, LIMITS.seo_title),
      seo_description: capText(row.seo_description, LIMITS.seo_description),
      status,
      published_at,
    };

    const { data, error } = await supabase.from("posts").insert(post).select("id").single();
    if (error) {
      results.push({ title, ok: false, kind: "failed", error: friendlyError(error.code, error.message), slug, rowNumber });
      continue;
    }

    usedSlugs.add(slug);
    createdThisRun.add(baseSlug);
    results.push({ title, ok: true, kind: "created", slug, id: data?.id as string | undefined, rowNumber });
  }

  refreshPublicPages();
  return { results };
}

/* ------------------------------------------------------------------ */
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export async function deleteMessage(formData: FormData) {
  const supabase = await requireAdmin();
  const id = text(formData, "id", 64);
  if (id) await supabase.from("messages").delete().eq("id", id);
  revalidatePath("/admin/messages");
}

/* ------------------------------------------------------------------ */
/* Subscribers (the email box at the bottom of every post)             */
/* ------------------------------------------------------------------ */

export async function deleteSubscriber(formData: FormData) {
  const supabase = await requireAdmin();
  const id = text(formData, "id", 64);
  if (id) await supabase.from("subscribers").delete().eq("id", id);
  revalidatePath("/admin/subscribers");
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await requireAdmin();

  const settings = {
    site_name: text(formData, "site_name", 200),
    author_name: text(formData, "author_name", 200),
    contact_email: text(formData, "contact_email", 200),
    etsy_url: text(formData, "etsy_url", 500),
    pinterest_url: text(formData, "pinterest_url", 500),
    description: text(formData, "description", 500),
    ads_enabled: formData.get("ads_enabled") === "on",
    adsense_client: text(formData, "adsense_client", 100),
    adsense_slot_in_article: text(formData, "adsense_slot_in_article", 100),
    adsense_slot_display: text(formData, "adsense_slot_display", 100),
  };

  const { error } = await supabase.from("settings").update(settings).eq("id", 1);
  if (error) return { error: friendlyError(error.code, error.message) };

  refreshPublicPages();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  const id = text(formData, "id", 64);
  const name = text(formData, "name", 100);
  const color = text(formData, "color", 40);
  const description = text(formData, "description", 500);
  const sort_order = Number(text(formData, "sort_order", 10)) || 0;

  if (!name) return { error: "The name is required." };
  if (!id) return { error: "Missing category." };

  const { error } = await supabase.from("categories").update({ name, color, description, sort_order }).eq("id", id);
  if (error) return { error: friendlyError(error.code, error.message) };

  refreshPublicPages();
  redirect("/admin/categories?saved=1");
}

/* ------------------------------------------------------------------ */
/* Static pages (About / Privacy / Terms / Disclaimer)                 */
/* ------------------------------------------------------------------ */

export async function saveStaticPage(_prev: FormState, formData: FormData): Promise<FormState> {
  const supabase = await requireAdmin();
  const slug = text(formData, "slug", 40) as StaticPageSlug;
  const title = text(formData, "title", 200);
  const content = text(formData, "content", 200000);

  if (!title) return { error: "The title is required." };

  const { error } = await supabase.from("pages").update({ title, content }).eq("slug", slug);
  if (error) return { error: friendlyError(error.code, error.message) };

  revalidatePath(`/${slug}`);
  redirect(`/admin/pages/${slug}?saved=1`);
}
