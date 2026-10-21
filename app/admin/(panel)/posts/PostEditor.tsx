"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { Category } from "@/lib/categories";
import { withImageMeta } from "@/lib/images";
import { renderMarkdown, slugify } from "@/lib/markdown";
import type { Post } from "@/lib/types";
import { readImageSize, uploadImage } from "@/lib/upload";
import { faqToText } from "@/lib/utils";
import { deletePost, savePost, type FormState } from "../../actions";

/* ------------------------------------------------------------------ */
/* Templates pre-filled in a NEW post                                  */
/* ------------------------------------------------------------------ */
const TEMPLATE = {
  content: `One or two friendly sentences: what we are making, who it is for, and why they will love it.

## Why you will love this pattern

- Quick to make: about ... hours
- Beginner friendly: only ... stitches
- Great for gifts / using up scraps

## Yarn and materials

Explain which yarn you used and why. Give a substitution tip.

## Tips before you start

Share 2–3 tips that save frustration (counting stitches, stitch markers, tension...).

## Step-by-step photos

Add process photos with the "Add photos" button, with a short sentence under each.

## Finishing and care

How to block, wash and care for the finished piece.
`,
  materials: `Worsted weight (4) cotton yarn – about ... yd
5 mm (H-8) crochet hook
Stitch marker
Scissors
Yarn needle`,
  abbreviations: `ch – chain
sl st – slip stitch
sc – single crochet
hdc – half double crochet
dc – double crochet
inc – increase (2 sts in the same st)
dec – decrease
st(s) – stitch(es)
rnd – round
MR – magic ring
FO – fasten off`,
  pattern: `**Notes:** The ch 1 at the beginning of each round does not count as a stitch.

**Rnd 1:** Make a MR, 6 sc in the ring. *(6 sts)*

**Rnd 2:** Inc in each st around. *(12 sts)*

**Rnd 3:** *Sc in next st, inc in next st*, repeat around. *(18 sts)*

**Finishing:** FO and weave in the ends.`,
  faq: `Q: What yarn can I use instead?
A: Any worsted weight (4) yarn works. Check your gauge first.

Q: Can I sell items made from this pattern?
A: Yes, you may sell finished items you made yourself. Please credit this site.`,
};

/** "2026-10-18T09:30:00Z" → "2026-10-18T11:30" in the browser's time zone (for datetime-local). */
function toLocalInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export default function PostEditor({
  post,
  saved,
  categories,
}: {
  post?: Post;
  saved?: string;
  categories: Category[];
}) {
  const isNew = !post;
  const [state, formAction, pending] = useActionState<FormState, FormData>(savePost, null);

  // Fields that need live behaviour
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [content, setContent] = useState(post?.content ?? TEMPLATE.content);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [coverUrl, setCoverUrl] = useState(post?.cover_url ?? "");
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seo_description ?? "");
  const [publishedLocal, setPublishedLocal] = useState("");
  const [uploading, setUploading] = useState<"" | "content" | "cover">("");
  const [uploadError, setUploadError] = useState("");

  const contentRef = useRef<HTMLTextAreaElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // The date is converted to local time in the browser (avoids time-zone surprises).
  useEffect(() => {
    setPublishedLocal(toLocalInput(post?.published_at));
  }, [post?.published_at]);

  const publishedIso = publishedLocal ? new Date(publishedLocal).toISOString() : "";
  const isFuture = publishedLocal ? new Date(publishedLocal).getTime() > Date.now() : false;
  const isPublished = post?.status === "published";

  function onTitleChange(value: string) {
    setTitle(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  /** Inserts text at the cursor position in the Markdown textarea. */
  function insertAtCursor(snippet: string) {
    const el = contentRef.current;
    if (!el) return setContent((c) => `${c}\n${snippet}`);
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + snippet.length;
    });
  }

  async function onPhotosSelected(files: FileList | null) {
    if (!files?.length) return;
    setUploadError("");
    setUploading("content");
    try {
      const snippets: string[] = [];
      for (const file of Array.from(files)) {
        // The pixel size is recorded in the Markdown link so the reader's
        // browser can reserve the right space before the photo arrives.
        const [url, size] = await Promise.all([uploadImage(file, { slug }), readImageSize(file)]);
        const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
        snippets.push(`![${alt}](${withImageMeta(url, size)})`);
      }
      setTab("write");
      insertAtCursor(`\n\n${snippets.join("\n\n")}\n\n`);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading("");
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function onCoverSelected(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading("cover");
    try {
      // No size hint here: the cover goes through <Image>, which builds its own
      // srcset, and a "#w=..." fragment would end up inside the optimizer URL.
      setCoverUrl(await uploadImage(file, { slug }));
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading("");
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  }

  const savedMessage =
    saved === "publish"
      ? isFuture
        ? "Saved and scheduled. It will appear on the site at the chosen date."
        : "Published! The site updates within a few seconds."
      : saved === "draft"
        ? "Draft saved."
        : saved === "unpublish"
          ? "The post is unpublished (back to draft)."
          : "";

  return (
    <>
      <div className="section-head" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>{isNew ? "New post" : "Edit post"}</h1>
        {post && isPublished && (
          <a href={`/blog/${post.slug}`} target="_blank" rel="noopener">
            View post ↗
          </a>
        )}
      </div>

      {savedMessage && !state?.error && (
        <p className="notice notice-ok" role="status">
          {savedMessage}
        </p>
      )}
      {state?.error && (
        <p className="notice notice-error" role="alert">
          {state.error}
        </p>
      )}
      {uploadError && (
        <p className="notice notice-error" role="alert">
          {uploadError}
        </p>
      )}

      <form action={formAction} className="editor">
        <input type="hidden" name="id" value={post?.id ?? ""} />
        <input type="hidden" name="cover_url" value={coverUrl} />
        <input type="hidden" name="published_at" value={publishedIso} />

        {/* ---------------- Main column ---------------- */}
        <div>
          <section className="panel">
            <div className="field">
              <label htmlFor="title">Title</label>
              <input id="title" name="title" type="text" required value={title} onChange={(e) => onTitleChange(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="slug">URL slug</label>
              <input
                id="slug"
                name="slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                }}
                onBlur={() => setSlug(slugify(slug))}
              />
              <p className="hint">/blog/{slug || "your-post-url"} — short, lowercase, with the main keyword.</p>
            </div>
            <div className="field">
              <label htmlFor="excerpt">Short summary</label>
              <textarea id="excerpt" name="excerpt" rows={2} maxLength={500} defaultValue={post?.excerpt ?? ""} />
              <p className="hint">1–2 sentences shown under the title and on post cards.</p>
            </div>
          </section>

          <section className="panel">
            <h2>Article</h2>
            <div className="tabs" role="tablist">
              <button type="button" role="tab" className="tab" aria-selected={tab === "write"} onClick={() => setTab("write")}>
                Write
              </button>
              <button type="button" role="tab" className="tab" aria-selected={tab === "preview"} onClick={() => setTab("preview")}>
                Preview
              </button>
              <span className="spacer" />
              <button
                type="button"
                className="btn btn-small"
                onClick={() => photoInputRef.current?.click()}
                disabled={uploading !== ""}
              >
                {uploading === "content" ? "Uploading…" : "+ Add photos"}
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => onPhotosSelected(e.target.files)}
              />
            </div>
            <textarea
              ref={contentRef}
              name="content"
              className="content"
              aria-label="Article content (Markdown)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              hidden={tab !== "write"}
            />
            {tab === "preview" && (
              <div className="preview prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }} />
            )}
            <p className="hint">
              Markdown: <code>## Heading</code> (goes into the table of contents), <code>**bold**</code>,{" "}
              <code>- list item</code>, <code>[link](https://...)</code>. An ad is inserted automatically in the middle.
            </p>
          </section>

          <section className="panel">
            <h2>Pattern card</h2>
            <p className="hint" style={{ marginTop: "-0.6rem", marginBottom: "1rem" }}>
              Leave “Instructions” empty for a tutorial: the pattern card will be hidden.
            </p>
            <div className="grid-2">
              <div className="field">
                <label htmlFor="difficulty">Skill level</label>
                <select id="difficulty" name="difficulty" defaultValue={post?.difficulty ?? "beginner"}>
                  <option value="">—</option>
                  <option value="beginner">Beginner</option>
                  <option value="easy">Easy</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="experienced">Experienced</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="time_estimate">Time</label>
                <input id="time_estimate" name="time_estimate" type="text" placeholder="2 hours" defaultValue={post?.time_estimate ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="yarn">Yarn</label>
                <input id="yarn" name="yarn" type="text" placeholder="Worsted weight (4) cotton, 50 yd" defaultValue={post?.yarn ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="hook">Hook</label>
                <input id="hook" name="hook" type="text" placeholder="5 mm (H-8)" defaultValue={post?.hook ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="gauge">Gauge</label>
                <input id="gauge" name="gauge" type="text" placeholder="16 sc x 18 rows = 4 in" defaultValue={post?.gauge ?? ""} />
              </div>
              <div className="field">
                <label htmlFor="finished_size">Finished size</label>
                <input id="finished_size" name="finished_size" type="text" placeholder="4.25 in diameter" defaultValue={post?.finished_size ?? ""} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="materials">Materials (one per line)</label>
              <textarea
                id="materials"
                name="materials"
                rows={5}
                className="mono"
                defaultValue={post ? post.materials.join("\n") : TEMPLATE.materials}
              />
            </div>
            <div className="field">
              <label htmlFor="abbreviations">Abbreviations (US terms, one per line: “sc – single crochet”)</label>
              <textarea
                id="abbreviations"
                name="abbreviations"
                rows={6}
                className="mono"
                defaultValue={post ? post.abbreviations : TEMPLATE.abbreviations}
              />
            </div>
            <div className="field">
              <label htmlFor="pattern">Instructions (Markdown, one round per paragraph)</label>
              <textarea
                id="pattern"
                name="pattern"
                rows={12}
                className="mono"
                defaultValue={post ? post.pattern : TEMPLATE.pattern}
              />
              <p className="hint">Start each round with <code>**Rnd 1:**</code> and end with the stitch count in <code>*(12 sts)*</code>.</p>
            </div>
          </section>

          <section className="panel">
            <h2>FAQ</h2>
            <div className="field">
              <label htmlFor="faq">Questions and answers</label>
              <textarea
                id="faq"
                name="faq"
                rows={8}
                className="mono"
                defaultValue={post ? faqToText(post.faq) : TEMPLATE.faq}
              />
              <p className="hint">Write “Q: …” then “A: …” on the next line. Leave a blank line between questions.</p>
            </div>
          </section>
        </div>

        {/* ---------------- Side column ---------------- */}
        <aside className="editor-side">
          <section className="panel">
            <h2>Publish</h2>
            <p style={{ marginTop: "-0.5rem" }}>
              Status:{" "}
              {isPublished ? (
                <span className="badge badge-published">Published</span>
              ) : (
                <span className="badge badge-draft">Draft</span>
              )}
            </p>
            <div className="field">
              <label htmlFor="published_local">Publish date</label>
              <input
                id="published_local"
                type="datetime-local"
                value={publishedLocal}
                onChange={(e) => setPublishedLocal(e.target.value)}
              />
              <p className="hint">
                {isFuture ? "Future date: the post will be scheduled." : "Leave empty to publish now. A future date schedules the post."}
              </p>
            </div>
            <div className="button-row">
              <button className="btn btn-primary" type="submit" name="intent" value="publish" disabled={pending || uploading !== ""}>
                {pending ? "Saving…" : isPublished ? "Update" : isFuture ? "Schedule" : "Publish"}
              </button>
              {!isPublished && (
                <button className="btn" type="submit" name="intent" value="draft" disabled={pending || uploading !== ""}>
                  Save draft
                </button>
              )}
              {isPublished && (
                <button className="btn" type="submit" name="intent" value="unpublish" disabled={pending}>
                  Unpublish
                </button>
              )}
            </div>
          </section>

          <section className="panel">
            <h2>Cover photo</h2>
            <div className="cover-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {coverUrl ? <img src={coverUrl} alt="Cover preview" /> : <span>Vertical 4:5 photo (e.g. 1000×1250)</span>}
            </div>
            <div className="button-row" style={{ marginBottom: "1rem" }}>
              <button type="button" className="btn btn-small" onClick={() => coverInputRef.current?.click()} disabled={uploading !== ""}>
                {uploading === "cover" ? "Uploading…" : coverUrl ? "Change photo" : "Upload photo"}
              </button>
              {coverUrl && (
                <button type="button" className="btn btn-small btn-danger" onClick={() => setCoverUrl("")}>
                  Remove
                </button>
              )}
              <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={(e) => onCoverSelected(e.target.files)} />
            </div>
            <div className="field">
              <label htmlFor="cover_alt">Alt text (describe the photo)</label>
              <input id="cover_alt" name="cover_alt" type="text" maxLength={300} defaultValue={post?.cover_alt ?? ""} placeholder="Cream crochet coaster under a mug of tea" />
            </div>
          </section>

          <section className="panel">
            <h2>Details</h2>
            <div className="field">
              <label htmlFor="category">Category</label>
              <select id="category" name="category" defaultValue={post?.category ?? "free-patterns"}>
                {categories.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tags">Tags (comma separated)</label>
              <input id="tags" name="tags" type="text" defaultValue={post?.tags.join(", ") ?? ""} placeholder="coaster, beginner, cotton" />
            </div>
            <div className="field">
              <label htmlFor="etsy_url">Etsy PDF link</label>
              <input id="etsy_url" name="etsy_url" type="url" defaultValue={post?.etsy_url ?? ""} placeholder="https://www.etsy.com/listing/..." />
              <p className="hint">Empty = link to your shop.</p>
            </div>
          </section>

          <section className="panel">
            <h2>SEO</h2>
            <div className="field">
              <label htmlFor="seo_title">
                SEO title <span className={`counter ${seoTitle.length > 60 ? "over" : ""}`}>{seoTitle.length}/60</span>
              </label>
              <input id="seo_title" name="seo_title" type="text" maxLength={120} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} placeholder={title} />
            </div>
            <div className="field">
              <label htmlFor="seo_description">
                SEO description{" "}
                <span className={`counter ${seoDescription.length > 160 ? "over" : ""}`}>{seoDescription.length}/160</span>
              </label>
              <textarea
                id="seo_description"
                name="seo_description"
                rows={4}
                maxLength={300}
                value={seoDescription}
                onChange={(e) => setSeoDescription(e.target.value)}
              />
              <p className="hint">Aim for 140–160 characters with your main keyword.</p>
            </div>
          </section>
        </aside>
      </form>

      {post && (
        <form
          action={deletePost}
          onSubmit={(e) => {
            if (!confirm(`Delete “${post.title}” forever? This cannot be undone.`)) e.preventDefault();
          }}
          style={{ marginTop: "1rem" }}
        >
          <input type="hidden" name="id" value={post.id} />
          <button className="btn btn-small btn-danger" type="submit">
            Delete post
          </button>
        </form>
      )}
    </>
  );
}
