import { getPublicClient } from "./supabase/public";
import type { Post, PostSummary } from "./types";

/**
 * Read-only queries for the public site.
 * RLS already hides drafts and future posts; we filter again for clarity.
 * Every function returns an empty result instead of crashing if Supabase is
 * not configured yet.
 */

const SUMMARY_FIELDS = "id, slug, title, excerpt, cover_url, cover_alt, category, published_at, updated_at";

function publishedQuery(fields: string) {
  const supabase = getPublicClient();
  if (!supabase) return null;
  return supabase
    .from("posts")
    .select(fields)
    .eq("status", "published")
    .lte("published_at", new Date().toISOString());
}

export async function getLatestPosts(limit = 12): Promise<PostSummary[]> {
  const query = publishedQuery(SUMMARY_FIELDS);
  if (!query) return [];
  const { data, error } = await query.order("published_at", { ascending: false }).limit(limit);
  if (error) console.error("getLatestPosts:", error.message);
  return (data as unknown as PostSummary[]) ?? [];
}

export async function getPostsByCategory(category: string, limit = 48): Promise<PostSummary[]> {
  const query = publishedQuery(SUMMARY_FIELDS);
  if (!query) return [];
  const { data, error } = await query
    .eq("category", category)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) console.error("getPostsByCategory:", error.message);
  return (data as unknown as PostSummary[]) ?? [];
}

/** How many cards one listing page shows. A multiple of 6 fills 1, 2 and 3 columns evenly. */
export const POSTS_PER_PAGE = 12;

export type PostsPage = {
  posts: PostSummary[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * One page of a listing, newest first. Used by the homepage, the category pages
 * and search so a blog with 200 patterns never renders 200 cards at once.
 * `page` is 1-based; out-of-range pages come back empty with the real count, so
 * the caller can send a 404.
 */
export async function getPostsPage({
  category,
  page = 1,
  perPage = POSTS_PER_PAGE,
}: {
  category?: string;
  page?: number;
  perPage?: number;
} = {}): Promise<PostsPage> {
  const empty = { posts: [], total: 0, page: 1, totalPages: 0 };

  const supabase = getPublicClient();
  if (!supabase) return empty;

  let query = supabase
    .from("posts")
    .select(SUMMARY_FIELDS, { count: "exact" })
    .eq("status", "published")
    .lte("published_at", new Date().toISOString());

  if (category) query = query.eq("category", category);

  const current = Math.max(1, Math.floor(page) || 1);
  const from = (current - 1) * perPage;

  const { data, count, error } = await query
    .order("published_at", { ascending: false })
    .range(from, from + perPage - 1);

  if (error) {
    console.error("getPostsPage:", error.message);
    return empty;
  }

  const total = count ?? 0;
  return {
    posts: (data as unknown as PostSummary[]) ?? [],
    total,
    page: current,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  const query = publishedQuery("*");
  if (!query) return null;
  const { data, error } = await query.eq("slug", slug).maybeSingle();
  if (error) console.error("getPostBySlug:", error.message);
  return (data as unknown as Post) ?? null;
}

export async function getRelatedPosts(category: string, excludeId: string, limit = 3): Promise<PostSummary[]> {
  const query = publishedQuery(SUMMARY_FIELDS);
  if (!query) return [];
  const { data } = await query
    .eq("category", category)
    .neq("id", excludeId)
    .order("published_at", { ascending: false })
    .limit(limit);
  return (data as unknown as PostSummary[]) ?? [];
}

export async function searchPosts(q: string): Promise<PostSummary[]> {
  const query = publishedQuery(SUMMARY_FIELDS);
  if (!query) return [];
  // Remove characters that have a meaning in PostgREST filters.
  const term = q.replace(/[%,()*\\:."']/g, " ").trim().slice(0, 80);
  if (!term) return [];
  const { data, error } = await query
    .or(`title.ilike.%${term}%,excerpt.ilike.%${term}%`)
    .order("published_at", { ascending: false })
    .limit(30);
  if (error) console.error("searchPosts:", error.message);
  return (data as unknown as PostSummary[]) ?? [];
}

/** Every published slug + date, for the sitemap and static generation. */
export async function getAllPublishedSlugs(): Promise<{ slug: string; updated_at: string; category: string }[]> {
  const query = publishedQuery("slug, updated_at, category");
  if (!query) return [];
  const { data } = await query.order("published_at", { ascending: false }).limit(5000);
  return (data as unknown as { slug: string; updated_at: string; category: string }[]) ?? [];
}
