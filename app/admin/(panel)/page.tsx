import type { Metadata } from "next";
import Link from "next/link";
import { getCategory } from "@/lib/categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Posts" };

type Row = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: "draft" | "published";
  published_at: string | null;
  updated_at: string;
};

export default async function AdminPostsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, category, status, published_at, updated_at")
    .order("updated_at", { ascending: false });

  const posts = (data ?? []) as Row[];
  const now = Date.now();
  const isScheduled = (p: Row) => p.status === "published" && p.published_at && new Date(p.published_at).getTime() > now;
  const published = posts.filter((p) => p.status === "published" && !isScheduled(p)).length;
  const scheduled = posts.filter(isScheduled).length;
  const drafts = posts.filter((p) => p.status === "draft").length;

  return (
    <>
      <div className="section-head" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Posts</h1>
        <Link className="btn btn-primary btn-small" href="/admin/posts/new">
          + New post
        </Link>
      </div>

      {deleted && <p className="notice notice-ok">The post was deleted.</p>}
      {error && <p className="notice notice-error">Could not load posts: {error.message}</p>}

      <div className="stats">
        <div className="stat">
          <b>{published}</b> published
        </div>
        <div className="stat">
          <b>{drafts}</b> drafts
        </div>
        {scheduled > 0 && (
          <div className="stat">
            <b>{scheduled}</b> scheduled
          </div>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="empty">No posts yet. Click “New post” to write your first pattern.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Category</th>
              <th>Status</th>
              <th>Last edited</th>
              <th>
                <span className="visually-hidden">View</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link className="title" href={`/admin/posts/${p.id}`}>
                    {p.title}
                  </Link>
                </td>
                <td data-label="Category">{getCategory(p.category)?.name ?? p.category}</td>
                <td data-label="Status">
                  {isScheduled(p) ? (
                    <span className="badge badge-scheduled">Scheduled {formatDate(p.published_at)}</span>
                  ) : p.status === "published" ? (
                    <span className="badge badge-published">Published</span>
                  ) : (
                    <span className="badge badge-draft">Draft</span>
                  )}
                </td>
                <td data-label="Last edited">{formatDate(p.updated_at)}</td>
                <td>
                  {p.status === "published" && !isScheduled(p) ? (
                    <Link href={`/blog/${p.slug}`} target="_blank">
                      View ↗
                    </Link>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
