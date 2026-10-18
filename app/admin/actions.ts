"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { categories, difficulties } from "@/lib/categories";
import { slugify } from "@/lib/markdown";
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
}

const text = (formData: FormData, key: string, max = 20000) => String(formData.get(key) ?? "").trim().slice(0, max);

/* ------------------------------------------------------------------ */
/* Login / logout                                                      */
/* ------------------------------------------------------------------ */

export type FormState = { error?: string } | null;

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
/* Messages                                                            */
/* ------------------------------------------------------------------ */

export async function deleteMessage(formData: FormData) {
  const supabase = await requireAdmin();
  const id = text(formData, "id", 64);
  if (id) await supabase.from("messages").delete().eq("id", id);
  revalidatePath("/admin/messages");
}
