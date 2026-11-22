import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ModerationForm from "./ModerationForm";

export const metadata: Metadata = { title: "Comments" };
type Row = {
  id: string; post_id: string; parent_id: string | null; name: string; body: string;
  status: string; is_author: boolean; created_at: string; posts: { title: string; slug: string } | null;
};
const statuses = ["pending", "approved", "hidden"] as const;

export default async function CommentsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const query = await searchParams;
  const status = statuses.find((value) => value === query.status) ?? "pending";
  const page = Math.min(10000, Math.max(1, Number.parseInt(query.page || "1", 10) || 1));
  const supabase = await createSupabaseServerClient();
  const [result, ...counts] = await Promise.all([
    supabase.from("post_comments")
      .select("id, post_id, parent_id, name, body, status, is_author, created_at, posts(title, slug)", { count: "exact" })
      .eq("status", status).order("created_at", { ascending: false }).range((page - 1) * 30, page * 30 - 1),
    ...statuses.map((value) => supabase.from("post_comments").select("id", { count: "exact", head: true }).eq("status", value)),
  ]);
  const rows = (result.data ?? []) as unknown as Row[];
  return (
    <>
      <h1>Comments &amp; conversations</h1>
      <p className="muted">Approve reader comments, hide unwanted messages, and reply with your designer badge. Hiding a conversation also hides its replies on the blog.</p>
      <nav className="community-admin-filters" aria-label="Filter comments">
        {statuses.map((value, index) => <Link key={value} className={`btn btn-small${status === value ? " btn-primary" : ""}`} href={`/admin/comments?status=${value}`} aria-current={status === value ? "page" : undefined}>{value === "pending" ? "Awaiting approval" : value === "approved" ? "Approved" : "Hidden"} ({counts[index].count ?? 0})</Link>)}
      </nav>
      {result.error && <p className="notice notice-error">{["PGRST205", "42P01"].includes(result.error.code) ? "Comments are not activated yet. Run supabase/add-community.sql in the blog project's Supabase SQL Editor." : "Comments could not be loaded. Please try again."}</p>}
      {!result.error && rows.length === 0 && <p className="empty">{status === "pending" ? "All caught up! New reader comments will appear here for approval." : "No comments in this view yet."}</p>}
      {rows.map((comment) => (
        <article className="message-card" key={comment.id}>
          <header><div><strong><bdi>{comment.name}</bdi></strong>{comment.is_author && <span className="community-author-badge">Designer</span>}{comment.parent_id && <span className="muted"> · Reply</span>}</div><time className="muted" dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</time></header>
          {comment.posts && <p><Link href={`/blog/${comment.posts.slug}#discussion`} target="_blank">{comment.posts.title} ↗</Link></p>}
          <p dir="auto">{comment.body}</p>
          <ModerationForm id={comment.id} postId={comment.post_id} parentId={comment.parent_id} status={comment.status} />
        </article>
      ))}
      <div className="community-admin-filters">
        {page > 1 && <Link className="btn btn-small" href={`/admin/comments?status=${status}&page=${page - 1}`}>← Previous</Link>}
        {(result.count ?? 0) > page * 30 && <Link className="btn btn-small" href={`/admin/comments?status=${status}&page=${page + 1}`}>Next →</Link>}
      </div>
    </>
  );
}
