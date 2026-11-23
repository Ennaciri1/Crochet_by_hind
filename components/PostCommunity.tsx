"use client";

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { CommunityComment, CommunityData } from "@/lib/community";

type CommunityContextValue = {
  data: CommunityData | null;
  error: string;
  loading: boolean;
  liking: boolean;
  postId: string;
  title: string;
  url: string;
  toggleLike: () => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
};

const CommunityContext = createContext<CommunityContextValue | null>(null);
function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw new Error("Community components require PostCommunity.");
  return context;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Something went wrong. Please try again.");
  return result as T;
}

const unavailable = "Likes and comments are temporarily unavailable. You can still share this pattern.";
const mergeComments = (comments: CommunityComment[]) => Array.from(new Map(comments.map((comment) => [comment.id, comment])).values());

/** Fetches interactions separately so the article keeps its static cache. */
export default function PostCommunity({ postId, title, url, children }: {
  postId: string; title: string; url: string; children: ReactNode;
}) {
  const [data, setData] = useState<CommunityData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [liking, setLiking] = useState(false);
  const [page, setPage] = useState(1);
  const endpoint = `/api/community/${postId}`;

  useEffect(() => {
    const controller = new AbortController();
    setData(null); setLoading(true); setError(""); setPage(1);
    request<CommunityData>(endpoint, { signal: controller.signal })
      .then(setData)
      .catch((error) => { if (error.name !== "AbortError") setError(unavailable); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [endpoint]);

  async function toggleLike() {
    if (!data || liking) return;
    setLiking(true); setError("");
    try {
      const result = await request<{ likes: number; liked: boolean }>(endpoint, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "like", liked: !data.liked }),
      });
      setData((current) => current ? { ...current, ...result } : current);
    } catch { setError("Your like could not be saved. Please try again."); }
    finally { setLiking(false); }
  }

  async function refresh() {
    if (loading || liking) return;
    setLoading(true); setError("");
    try {
      const results = await Promise.all(Array.from({ length: page }, (_, index) =>
        request<CommunityData>(`${endpoint}?page=${index + 1}`)));
      setData({ ...results[0], comments: mergeComments(results.flatMap((result) => result.comments)), has_more: results.at(-1)!.has_more });
    } catch { setError(unavailable); }
    finally { setLoading(false); }
  }

  async function loadMore() {
    if (loading || liking || !data?.has_more) return;
    setLoading(true); setError("");
    try {
      const result = await request<CommunityData>(`${endpoint}?page=${page + 1}`);
      setData((current) => ({ ...result, comments: mergeComments([...(current?.comments ?? []), ...result.comments]) }));
      setPage(page + 1);
    } catch { setError("More comments could not be loaded. Please try again."); }
    finally { setLoading(false); }
  }

  return <CommunityContext.Provider value={{ data, error, loading, liking, postId, title, url, toggleLike, refresh, loadMore }}>{children}</CommunityContext.Provider>;
}

function Icon({ kind, filled = false }: { kind: "heart" | "comment" | "share"; filled?: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {kind === "heart" && <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />}
      {kind === "comment" && <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" />}
      {kind === "share" && <><path d="m12 16 0-13m-5 5 5-5 5 5" /><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>}
    </svg>
  );
}

/** The article's heart, comment shortcut and native/social sharing. */
export function CommunityActions() {
  const { data, error, loading, liking, title, url, toggleLike } = useCommunity();
  const [sharing, setSharing] = useState(false);
  const [message, setMessage] = useState("");
  const [manualCopy, setManualCopy] = useState(false);

  async function share() {
    setMessage("");
    if (navigator.share) {
      try { await navigator.share({ title, url }); return; }
      catch (error) { if (error instanceof Error && error.name === "AbortError") return; }
    }
    setSharing((open) => !open);
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(url); setMessage("Link copied! Send a little crochet inspiration."); }
    catch { setManualCopy(true); setMessage("Select and copy this link to share it."); }
  }

  return (
    <div className="community-actions-wrap read no-print">
      <div className="community-actions" aria-label="React to this post">
        <button className={`community-action community-like${data?.liked ? " is-liked" : ""}`} type="button"
          aria-pressed={data?.liked ?? false} disabled={!data || liking || loading} onClick={toggleLike}>
          <Icon kind="heart" filled={data?.liked} />
          <span>{liking ? "Saving…" : data?.liked ? "Loved" : "Love this"}</span>
          <span className="community-count">{data ? data.likes.toLocaleString("en-US") : "…"}</span>
        </button>
        <a className="community-action" href="#discussion">
          <Icon kind="comment" /><span>Comments</span>
          <span className="community-count">{data ? data.comment_count.toLocaleString("en-US") : "…"}</span>
        </a>
        <button className="community-action" type="button" onClick={share} aria-expanded={sharing} aria-controls="post-share-options">
          <Icon kind="share" /><span>Share</span>
        </button>
      </div>
      {sharing && (
        <div className="community-share" id="post-share-options">
          <span>Pass the inspiration along</span>
          <div className="community-share-links">
            <a href={`https://wa.me/?text=${encodeURIComponent(`${title}\n${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
            <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener noreferrer">Facebook ↗</a>
            <button type="button" onClick={copyLink}>Copy link</button>
            <button type="button" className="community-share-close" onClick={() => setSharing(false)} aria-label="Close sharing options">×</button>
          </div>
          {manualCopy && <input aria-label="Post link" readOnly value={url} onFocus={(event) => event.target.select()} />}
          <p role="status">{message}</p>
        </div>
      )}
      {error && <p className="community-feedback" role="status">{error}</p>}
    </div>
  );
}

function Comment({ comment, reply }: { comment: CommunityComment; reply: (comment: CommunityComment) => void }) {
  return (
    <article className={`community-comment${comment.is_author ? " is-author" : ""}`} id={`comment-${comment.id}`}>
      <span className="community-avatar" aria-hidden="true">{comment.name.charAt(0).toUpperCase()}</span>
      <div className="community-comment-content">
        <header>
          <strong><bdi>{comment.name}</bdi></strong>
          {comment.is_author && <span className="community-author-badge">Designer</span>}
          <time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time>
        </header>
        <p dir="auto">{comment.body}</p>
        <button type="button" className="community-text-button" onClick={() => reply(comment)}>Reply <span className="visually-hidden">to {comment.name}</span></button>
      </div>
    </article>
  );
}

export function CommunityDiscussion() {
  const { data, loading, liking, error, postId, refresh, loadMore } = useCommunity();
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const roots = (data?.comments.filter((comment) => !comment.parent_id) ?? [])
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));

  function reply(comment: CommunityComment) {
    setReplyTo(comment); setFeedback(null);
    document.getElementById("comment-message")?.focus();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    const form = new FormData(event.currentTarget);
    setSending(true); setFeedback(null);
    try {
      await request(`/api/community/${postId}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation: "comment", name, body, website: form.get("website"), parentId: replyTo?.parent_id || replyTo?.id || null }),
      });
      setBody(""); setReplyTo(null);
      setFeedback({ ok: true, text: "Thank you! Your message is waiting for approval. Come back soon to keep the conversation going." });
    } catch (error) {
      setFeedback({ ok: false, text: error instanceof Error ? error.message : "Your comment could not be sent. Please try again." });
    } finally { setSending(false); }
  }

  return (
    <section className="community-discussion no-print" id="discussion" aria-labelledby="discussion-title">
      <div className="community-discussion-heading">
        <div>
          <p className="eyebrow">A little yarn, a little conversation</p>
          <h2 id="discussion-title">Let’s talk crochet <span className="community-discussion-total">{data?.comment_count ?? "…"}</span></h2>
          <p>Made it? Have a question? Pull up a chair and join in.</p>
        </div>
        <button type="button" className="community-text-button" disabled={loading || liking} onClick={refresh}>{loading ? "Loading…" : "Refresh"}</button>
      </div>

      <form className="community-form" id="comment-form" onSubmit={submit}>
        <h3>{replyTo ? "Add your reply" : "Leave a little yarn love"}</h3>
        {replyTo && (
          <div className="community-reply-to">
            <span>Replying to <strong><bdi>{replyTo.name}</bdi></strong></span>
            <button className="community-text-button" type="button" onClick={() => setReplyTo(null)}>Cancel reply</button>
          </div>
        )}
        <div className="field">
          <label htmlFor="comment-name">Your name</label>
          <input id="comment-name" name="name" type="text" autoComplete="given-name" required maxLength={60}
            placeholder="What should we call you?" value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="comment-message">{replyTo ? "Your reply" : "Your comment"}</label>
          <textarea id="comment-message" name="body" rows={4} required minLength={3} maxLength={2000} value={body}
            onChange={(event) => setBody(event.target.value)} placeholder="Ask about a stitch, share what you’re making, or say hello…" />
        </div>
        <div className="honeypot" aria-hidden="true"><label htmlFor="comment-website">Leave this empty</label><input id="comment-website" name="website" type="text" tabIndex={-1} autoComplete="off" /></div>
        <div className="community-form-bottom">
          <p>No account needed. Comments appear after approval. Your name and message will be public. <a href="/privacy-policy">Privacy</a></p>
          <button className="btn btn-primary" type="submit" disabled={!data || sending}>{sending ? "Sending…" : replyTo ? "Send reply" : "Post comment"}</button>
        </div>
        {feedback && <p className={`notice ${feedback.ok ? "notice-ok" : "notice-error"}`} role={feedback.ok ? "status" : "alert"}>{feedback.text}</p>}
      </form>

      {!data && loading && <p className="community-empty" role="status">Gathering the conversation…</p>}
      {error && !data && <p className="community-empty" role="status">{error}</p>}
      {data && roots.length === 0 && (
        <div className="community-empty"><Icon kind="comment" /><h3>The conversation starts with you</h3><p>A question, a finished project, a little encouragement — we’d love to hear it.</p></div>
      )}
      <div className="community-threads">
        {roots.map((root) => (
          <div className="community-thread" key={root.id}>
            <Comment comment={root} reply={reply} />
            {data!.comments.filter((comment) => comment.parent_id === root.id).map((comment) => (
              <div className="community-replies" key={comment.id}><Comment comment={comment} reply={reply} /></div>
            ))}
          </div>
        ))}
      </div>
      {data?.has_more && <button className="btn community-load-more" type="button" disabled={loading || liking} onClick={loadMore}>{loading ? "Loading…" : "More conversations"}</button>}
    </section>
  );
}
