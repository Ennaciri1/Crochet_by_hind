# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

A free-crochet-pattern blog (English, US crochet terms) with a public site and a self-service admin panel.
Next.js 16 App Router + React 19, Supabase (Postgres + Auth + Storage), deployed on Vercel. Plain CSS, no
Tailwind. No test suite.

The owner is **non-technical**: every piece of content — posts, categories, static pages, site name, AdSense
ids — is editable from `/admin` without a redeploy. Keep it that way; don't move editable content back into code.

## Commands

```bash
npm run dev                  # next dev on :3000
npm run build                # production build
npm run lint                 # tsc --noEmit  (this is a TYPECHECK — there is no ESLint in this project)
npm run import:posts         # CLI bulk import, reads import/posts.json; add -- --apply to write
npm run backfill:image-sizes # add "#w=&h=" size hints to photos already in posts; add -- --apply
```

`next dev` writes an `AGENTS.md` at the root (Next's own agent rules) and rewrites it whenever it is
removed. Commit it with your work rather than fighting it.

`npm run lint` is the only check that exists. Run it after edits. The stray
`// eslint-disable-next-line` in [ImportForm.tsx](app/admin/(panel)/import/ImportForm.tsx) is vestigial.

## Security model: anon key + RLS

The app ships **no secret keys**. It uses only `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and all authorization lives in
Row Level Security policies in [supabase/schema.sql](supabase/schema.sql). `SUPABASE_SERVICE_ROLE_KEY` is used by
exactly one thing — [scripts/import-to-supabase.mjs](scripts/import-to-supabase.mjs) — and must never reach the
app or a `NEXT_PUBLIC_` variable.

Writes are gated in three independent layers; keep all three when adding admin features:

1. [proxy.ts](proxy.ts) — Next 16's renamed middleware. Refreshes the session cookie and bounces anonymous
   visitors from `/admin/*` to `/admin/login`. It only checks "logged in", not "is admin".
2. [app/admin/(panel)/layout.tsx](app/admin/(panel)/layout.tsx) — calls the `is_admin()` RPC and shows "Access
   denied" to logged-in non-admins.
3. `requireAdmin()` in [app/admin/actions.ts](app/admin/actions.ts) — re-checks in every server action. RLS
   enforces it again in the database.

Admin status = a row in the `admins` table keyed on `auth.users.id`, added by hand in SQL.

## Three Supabase clients — pick deliberately

| File | Use for | Why it matters |
| --- | --- | --- |
| [lib/supabase/public.ts](lib/supabase/public.ts) | public pages, sitemap, `ads.txt`, contact form | **Reads no cookies**, so pages stay statically cacheable (ISR). Returns `null` when env vars are missing so the site still builds. |
| [lib/supabase/server.ts](lib/supabase/server.ts) | admin server components + server actions | Cookie-based, so queries run as the logged-in user and RLS grants admin reads/writes. |
| [lib/supabase/client.ts](lib/supabase/client.ts) | browser: login, image uploads | |

Using the cookie client on a public page silently makes that page dynamic and kills ISR. Using the public client
in the admin silently hides drafts.

## Data and where content lives

Tables (all in [supabase/schema.sql](supabase/schema.sql), safe to re-run): `posts`, `settings` (single row,
`id = 1`), `categories`, `pages`, `admins`, `messages`, `subscribers`, plus a public `images` storage bucket.

The article body is a `.post-layout` grid: one column everywhere, and from 1180px a second 300px column
holding a sticky `.post-aside` ([AuthorBio](components/AuthorBio.tsx) then the sign-up box). The sign-up box is rendered **once** and moves between the two by grid flow —
sticky beside the article on a wide screen, last thing in the article on a narrow one. Don't "fix" this by
rendering it twice and hiding one: that duplicates the form's `id` attributes and breaks the labels. The
breakpoint is 1180px because 760 (`--read`) + 40 gap + 300 fits inside `--wrap` minus the gutters; narrowing
the reading column to fit a sidebar earlier would undo the reading-width work.

[lib/brevo.ts](lib/brevo.ts) pushes each new address to Brevo after Supabase has stored it. Two properties
are deliberate and worth keeping: it is **optional** (no `BREVO_API_KEY` → the site behaves exactly as before,
everything still lands in Supabase) and it **never throws or blocks** — the reader has already subscribed, so a
slow or broken Brevo must not turn a successful sign-up into an error. Failures are logged and recoverable from
`/admin/subscribers` → Download CSV. It retries without `attributes` if Brevo rejects the first-name attribute,
because accounts differ (`FIRSTNAME` vs `FNAME`, override with `BREVO_NAME_ATTRIBUTE`). A duplicate-email
sign-up is still pushed to Brevo, so addresses captured before Brevo was connected get there eventually.
`BREVO_API_KEY` is server-only and must never gain a `NEXT_PUBLIC_` prefix.

`settings.author_bio` holds the short "about me" beside each pattern. It ships as
[supabase/add-author-bio.sql](supabase/add-author-bio.sql) because it was added after the first deploy;
until that runs, `select("*")` simply returns no such field, the bio falls back to `""` and
[AuthorBio](components/AuthorBio.tsx) renders nothing. Emptying the field in /admin hides the box — that is
the intended switch, not a bug.

`subscribers` backs the email box at the bottom of every post
([SubscribeForm](components/SubscribeForm.tsx) → [newsletter/actions.ts](app/(site)/newsletter/actions.ts) →
`/admin/subscribers`). Its RLS deliberately gives anon **insert only and no select**, so the mailing list can
never be read back from the public site. `email` is unique and the action turns the resulting `23505` into a
friendly "you are already on the list" rather than an error. `source` records the post someone signed up from.
Because it was added after the first deploy, it also ships as a standalone
[supabase/add-subscribers.sql](supabase/add-subscribers.sql); until that is run, the API answers `PGRST205`
and both the form and the admin page say so in plain language instead of crashing.

`Post` shape is [lib/types.ts](lib/types.ts). Read queries for the public site are [lib/posts.ts](lib/posts.ts)
(every function returns an empty result rather than throwing). Settings, categories and static pages are each
read through a `react`-`cache`d getter with a **hardcoded fallback** used before `schema.sql` has been run:
[lib/site.ts](lib/site.ts), [lib/categories.ts](lib/categories.ts), [lib/pages.ts](lib/pages.ts). Those fallbacks
are duplicated in `schema.sql`'s seed block — change both together.

Draft/scheduled posts: RLS exposes a post only when `status = 'published' AND published_at <= now()`, so a future
date schedules it and it appears within the ISR window with no cron.

## Caching and revalidation

Public pages are ISR with `export const revalidate = 300` (5 min). `/admin` is `force-dynamic` and
`robots: noindex`. After any admin write, `refreshPublicPages()` in [app/admin/actions.ts](app/admin/actions.ts)
calls `revalidatePath("/", "layout")` **plus** `/sitemap.xml` and `/robots.txt` by name — metadata routes sit
outside the layout tree and would otherwise keep serving an unpublished post. New metadata routes need adding
there.

`app/sitemap.ts` is `force-dynamic`, not ISR. With `revalidate` it came back from the CDN as a plain
`x-vercel-cache: HIT` with none of the `x-nextjs-prerender` / `x-nextjs-stale-time` headers the page routes
carry, so it never regenerated — observed frozen for seven hours with new posts missing. A sitemap costs one
indexed query and crawlers fetch it rarely, so correctness beats caching here. This also covers posts added by
`npm run import:posts`, which runs outside the app and so cannot call `revalidatePath` at all.

`SITE_URL` resolution order ([lib/site.ts](lib/site.ts)): `NEXT_PUBLIC_SITE_URL` → Vercel's
`VERCEL_PROJECT_PRODUCTION_URL` → localhost. It is build-time only, deliberately not a DB setting.

## Images: everything goes through the optimizer

[lib/images.ts](lib/images.ts) is the single source of truth for image delivery, and it is deliberately
dependency-free because **next.config.ts imports it** for the Supabase remote-pattern host.

- Covers and cards use `<Image>` via [CoverImage](components/CoverImage.tsx), inside a parent that owns the
  aspect ratio, so there is no layout shift.
- Body photos are plain Markdown and cannot use `<Image>`, so the `image` renderer in
  [lib/markdown.ts](lib/markdown.ts) hand-builds the same `/_next/image?url=…&w=…&q=…` URLs plus a `srcset`.
  Before this, a step photo served its Supabase original — 3.2 MB of PNG on a phone.
- `IMAGE_WIDTHS` may only hold widths from Next's `imageSizes` + `deviceSizes`; anything else 400s. Qualities
  must be in `next.config.ts`'s `qualities` list (75 for photos, 85 for covers) or Next coerces them.
- `isOptimizable()` is the safety valve: SVGs, `data:` URIs and foreign hosts render as a plain `<img>`
  untouched, so no existing image can break.
- **Size hints.** Markdown image URLs carry `#w=1086&h=1448`, which becomes `width`/`height` on the `<img>` so
  the browser reserves the right box. A URL fragment is never sent to a server, so adding one cannot break an
  image. Both upload paths append it (body photos only — a cover's hint would end up inside the optimizer
  URL), and `scripts/backfill-image-sizes.mjs` fills it in for photos uploaded earlier by reading each file's
  header over HTTP. Anything without a hint still renders, just without the reserved box.
- `storagePath()` in the importer strips the hint before reporting an orphaned file.

Whenever you touch card or cover markup, keep the `sizes` attribute in step with the CSS breakpoints — a
stale `sizes` is invisible in the layout but makes phones download desktop-sized images.

## Markdown: rendered with dangerouslySetInnerHTML

Post bodies, pattern instructions and static pages are Markdown rendered to HTML and injected directly.
Sanitization is **entirely** `stripScripts()` in [lib/markdown.ts](lib/markdown.ts). Any new code path that
renders stored Markdown must go through `renderMarkdown()` or `renderArticleWithBreak()` — never call
`marked.parse` directly.

Also in that file: `slugify()` (the canonical slug rule, duplicated in `scripts/import-to-supabase.mjs` — keep
in sync), `getToc()` from `##` headings, and `renderArticleWithBreak()`, which splits the article in two so an
in-article ad lands mid-post. The split needs **≥4 paragraphs of prose**; image-only paragraphs do not count,
so an ad never lands between a photo and the text explaining it, and shorter posts get no mid-article ad.

The `paragraph` renderer is overridden for a structural reason: a `<figure>` is invalid inside a `<p>`, and the
browser would hoist it out and leave an empty paragraph behind. A paragraph holding only images therefore skips
the `<p>` wrapper. Don't remove that without also unwrapping figures.

## Post page structure

[app/(site)/blog/[slug]/page.tsx](app/(site)/blog/[slug]/page.tsx) emits JSON-LD that branches on content:
a post with non-empty `pattern` becomes a schema.org **HowTo** (materials → supply, hook → tool, paragraphs →
steps); an empty `pattern` becomes a **BlogPosting** and the printable [PatternCard](components/PatternCard.tsx)
is hidden entirely. `faq` adds a separate FAQPage block. `generateStaticParams` prebuilds the newest 100 posts.

[PrintButton.tsx](components/PrintButton.tsx) prints only the pattern card by cloning it into a hidden iframe
with the site stylesheets — ads and chrome never reach paper.

Reading-experience pieces: the table of contents is a compact row of wrapping pills rather than a tall boxed
list, and [Lightbox.tsx](components/Lightbox.tsx) lets a reader tap a step photo to see it full size. The
lightbox is mounted once per article and listens on the document, so there is nothing to re-bind per photo; the
markdown renderer wraps each photo in a `<button class="zoom-btn">` so the affordance is keyboard-reachable
without any inline script. It is an enhancement — with JavaScript off the photos are still readable inline.

## Ads

AdSense ids come from `settings` (DB), not env, and are threaded from server components down into
[AdSlot](components/AdSlot.tsx) as props. `adsEnabled` is an owner kill switch: callers pass
`site.adsEnabled ? site.adsenseClient : ""` and an empty client renders nothing (a dashed placeholder in dev).
[AdSenseScript](components/AdSenseScript.tsx) loads only in the public layout, never in `/admin`.
[app/ads.txt/route.ts](app/ads.txt/route.ts) derives `pub-…` from the stored `ca-pub-…`.

## Bulk import (`/admin/import`)

The largest and trickiest subsystem: [ImportForm.tsx](app/admin/(panel)/import/ImportForm.tsx) (~1.6k lines,
client) plus `importPosts()` in [actions.ts](app/admin/actions.ts). It generates its own `.xlsx` template,
including the "How to fill this in" sheet — **that sheet is the user-facing column documentation**, so column
changes mean editing `HEADER_KEYS`, `SAMPLE` and `COLUMN_NOTES` together.
[scripts/import-template.md](scripts/import-template.md) deliberately holds only the ChatGPT prompt, not column docs.

How it works:

- Caps: 200 rows, 5 MB workbook, sheet named `Posts`, 4 concurrent uploads, posts saved in chunks of 10.
- **Photos are matched by filename convention, never fuzzy**: `<slug>-cover.jpg` (or `<slug>.jpg`) for the cover,
  `<slug>-1.jpg`, `<slug>-2.jpg`… for body photos, in numeric order. Explicit `cover_photo` / `photos` cells
  override. A `cover_photo` cell starting with `http` is used as a URL and not uploaded.
- `[photo]` / `[photo:N]` tokens in the `content` cell are replaced by Markdown images
  (`applyPhotoTokens` in [lib/post-fields.ts](lib/post-fields.ts)); surplus photos are appended under
  `## Step-by-step photos`, and unmatched tokens are deleted so a literal `[photo]` can't ship.
- Two phases: upload **all** photos to Storage first, then insert rows. So a failed insert leaves orphaned
  images — the UI reports their storage paths for manual cleanup, and offers a download of the failed rows
  as a retry workbook.
- Validation is advisory-first: warnings are `blocked` / `warn` / `info`; only `blocked` (and the template's
  example row) prevents import. Duplicate slugs are either skipped or suffixed `-2`, per the user's choice.

[lib/post-fields.ts](lib/post-fields.ts) is the shared contract between the editor and the importer — `LIMITS`,
difficulty/status normalization, Excel serial-date parsing, tag and material parsing. It must stay free of
database and client imports.

## Styling

One stylesheet, [app/globals.css](app/globals.css), **mobile first**: the base rules are the phone layout and a
handful of `@media (min-width: …)` blocks add columns. Tokens live at the top: warm ivory/cream surfaces, a sage
`--accent` (dark enough for AA on ivory), six muted `--yarn-*` colors with matching `--tint-*`, fonts, and layout
widths (`--wrap` 1180px, `--read` 760px). The palette is fresh cotton colours: white surfaces, a red
`--accent` (`#d62839`, 4.9:1 on the background and 5:1 for white text on it, so it passes AA), a yellow
`--stitch`, and six bright `--yarn-*` colours with matching `--tint-*`. Check contrast before changing
`--accent`: it is the colour of every link and primary button. Each category carries a color name; `yarnVars(color)` in
[lib/categories.ts](lib/categories.ts) returns `{ "--c", "--t" }` as an inline style, and components style
themselves with `var(--c)`. That's the mechanism behind per-category theming — use it instead of adding color
classes. Fonts are self-hosted via `next/font` (Source Serif 4 body, Bricolage Grotesque headings).

Layout rules worth knowing before editing:

- `.post-grid` is 1 column under 360px, 2 up to 1023px, then 3. `CARD_SIZES` in
  [PostCard.tsx](components/PostCard.tsx) mirrors those breakpoints and must be changed with them.
- `.figure img` uses `width: auto; max-width: 100%; max-height: min(80svh, 820px)` so a tutorial photo is
  scaled to fit but **never cropped or stretched** — stitch detail has to stay readable. Print removes the cap.
- Hover effects are inside `@media (hover: hover)` so they never fire on a tap.
- Touch targets (nav, pills, pagination, TOC, FAQ summaries) are kept at 38–44px minimum.

## Brand assets

`public/logo.png` (512px) is the header badge and `app/icon.png` (256px) is the favicon, which Next picks up
from the filename alone — there is no `<link rel="icon">` anywhere. Both were cut from the owner's circular
artwork, which arrived as an RGB PNG on a solid black square: the script in the scratchpad found the
non-black bounding box, cropped to it, and applied an antialiased circular alpha inset by 1.8% so the
artwork's own dark outer ring is trimmed and the badge sits on any background. If the logo is ever replaced,
keep the transparent circle — the header has no plate behind it. The header `<Image>` uses `alt=""` on
purpose, because the site name sits right next to it.

## Conventions

- Every file opens with a short comment saying what it's for and *why*, in plain English a non-developer could
  follow. Match that.
- User-facing error and warning strings are written for the non-technical owner, with the fix included
  ("iPhone photos in HEIC format cannot be shown on the web. On your iPhone open Settings > Camera > Formats…").
  Never surface a raw Postgres error; see `friendlyError()`.
- Server actions take `(prevState, formData)` and return `FormState` (`{ error?, ok? }`) for `useActionState`;
  they `redirect()` on success. Field reads go through the local `text(formData, key, max)` helper, which trims
  and caps.
- Strict TypeScript, `@/*` path alias. Supabase rows are cast via `as unknown as T` — there are no generated
  database types.
- Comments are English; the [README.md](README.md) is a French, owner-facing setup walkthrough (Supabase →
  Vercel → domain → AdSense). Its "where to change what" table is slightly stale: categories and legal pages
  now live in the database, edited at `/admin`.

## Sharp edges

- **A 6th category needs SQL.** `posts.category` has a hardcoded `CHECK` constraint on the five slugs, while
  categories are a table. The admin can rename/recolor/reorder only — `saveCategory()` has no insert or delete.
  Adding a category means altering the constraint, inserting the row, and updating the `fallbackCategories`
  array and the `--yarn-*` token if the color is new.
- **Two FAQ parsers with different rules.** The editor's `savePost` uses `parseFaq` in
  [lib/utils.ts](lib/utils.ts), which *requires* a blank line between `Q:`/`A:` pairs. The importer uses the
  more forgiving `parseFaqText` in [lib/post-fields.ts](lib/post-fields.ts) (blank line optional, accepts
  `Q: … | A: …`), because Excel's Alt+Enter gives only one newline. Prefer `parseFaqText` for anything new.
- **`REVALIDATE_SECONDS` in [lib/site.ts](lib/site.ts) is dead** — every listing and article page hardcodes
  `revalidate = 300`. Changing the ISR window means editing each one.
- **Listings paginate by path, not query string.** `/category/[slug]` is page 1 and
  `/category/[slug]/page/[n]` is the rest, both sharing [listing.tsx](app/(site)/category/[slug]/listing.tsx).
  This exists because reading `searchParams` would opt the route into dynamic rendering and lose the static
  cache. Page 2+ is `noindex, follow` so the category root is the one URL that ranks. The homepage shows the
  newest `POSTS_PER_PAGE` and links onward rather than paginating.
- `savePost` also builds `materials` with a local `lines()` helper rather than `parseMaterials`, so item caps
  differ slightly between the editor and the importer.
- Covers are cropped 4:5 (portrait, ~1000×1250) for Pinterest; landscape covers get visibly cut off, which is
  why the importer warns about them.
- **`xlsx` is installed from SheetJS's own CDN** (`https://cdn.sheetjs.com/xlsx-0.20.3/…tgz`), not npm: npm stops at
  0.18.5, which has a high-severity advisory with no npm fix. Upgrade by changing that URL, never `npm i xlsx`.
- `next.config.ts` raises the server-action body limit to 8 MB for import batches and whitelists only the
  Supabase storage host for `next/image`. A different storage host needs adding there.
