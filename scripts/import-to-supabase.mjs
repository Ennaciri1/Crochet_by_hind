// Imports blog posts straight into Supabase, without going through /admin.
//
//   Preview (writes nothing):  npm run import:posts
//   Really import:             npm run import:posts -- --apply
//
// Reads import/posts.json (an array of posts) and the photos in import/photos/.
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Project Settings → API keys).
// Posts whose slug already exists are skipped, so running it twice is safe.

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const IMPORT_DIR = join(ROOT, "import");
const PHOTOS_DIR = join(IMPORT_DIR, "photos");
const POSTS_FILE = join(IMPORT_DIR, "posts.json");
const BUCKET = "images";
const APPLY = process.argv.includes("--apply");

const CATEGORIES = ["free-patterns", "amigurumi", "wearables", "home-decor", "tutorials"];
const DIFFICULTIES = ["beginner", "easy", "intermediate", "experienced"];
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };

/** Same rule as lib/markdown.ts so URLs match posts made in the admin. */
function slugify(text) {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const str = (v) => (v == null ? "" : String(v).trim());
const list = (v) => (Array.isArray(v) ? v : str(v).split(/\n|,/)).map(str).filter(Boolean);

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is missing from .env.local.");
if (!key) fail("SUPABASE_SERVICE_ROLE_KEY is missing from .env.local (Supabase → Project Settings → API keys → service_role).");
if (!existsSync(POSTS_FILE)) fail(`No file at import/posts.json.`);

let posts;
try {
  posts = JSON.parse(readFileSync(POSTS_FILE, "utf8"));
} catch (e) {
  fail(`import/posts.json is not valid JSON: ${e.message}`);
}
if (!Array.isArray(posts)) fail("import/posts.json must be an array: [ { ...post }, { ...post } ]");

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: existing, error: readError } = await supabase.from("posts").select("slug");
if (readError) fail(`Could not read posts: ${readError.message}`);
const usedSlugs = new Set(existing.map((p) => p.slug));

/** Uploads import/photos/<name> and returns its public URL (or a placeholder in preview mode). */
async function uploadPhoto(name, slug) {
  const file = join(PHOTOS_DIR, name);
  if (!existsSync(file)) throw new Error(`photo not found: import/photos/${name}`);
  const ext = extname(name).toLowerCase();
  if (!MIME[ext]) throw new Error(`unsupported photo type: ${name} (use jpg, png, webp or avif)`);
  if (!APPLY) return `(photo:${name})`;

  const path = `posts/${slug}/${Date.now()}-${slugify(name.replace(/\.[^.]+$/, "")) || "photo"}${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, readFileSync(file), { contentType: MIME[ext], cacheControl: "31536000", upsert: false });
  if (error) throw new Error(`upload failed for ${name}: ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Replaces `photo:file.jpg` inside Markdown images, e.g. ![Step 1](photo:step1.jpg). */
async function replacePhotoTokens(markdown, slug) {
  let out = markdown;
  for (const [, name] of markdown.matchAll(/\(photo:([^)\s]+)\)/g)) {
    out = out.replace(`(photo:${name})`, `(${await uploadPhoto(name, slug)})`);
  }
  return out;
}

console.log(APPLY ? "Importing into Supabase…\n" : "Preview only — add --apply to really import.\n");
let created = 0, skipped = 0, failed = 0;

for (const [i, row] of posts.entries()) {
  const title = str(row.title);
  const label = `#${i + 1} ${title || "(no title)"}`;
  try {
    if (!title) throw new Error("title is empty");
    const slug = slugify(row.slug || title);
    if (!slug) throw new Error("could not build a slug");
    if (usedSlugs.has(slug)) {
      console.log(`– skipped  ${label}  (/blog/${slug} already exists)`);
      skipped++;
      continue;
    }

    const category = str(row.category).toLowerCase();
    const difficulty = str(row.difficulty).toLowerCase();
    const status = str(row.status).toLowerCase() === "published" ? "published" : "draft";
    if (category && !CATEGORIES.includes(category)) throw new Error(`unknown category "${category}"`);
    if (difficulty && !DIFFICULTIES.includes(difficulty)) throw new Error(`unknown difficulty "${difficulty}"`);

    const post = {
      title,
      slug,
      excerpt: str(row.excerpt),
      content: await replacePhotoTokens(str(row.content), slug),
      cover_url: row.cover_photo ? await uploadPhoto(str(row.cover_photo), slug) : str(row.cover_url) || null,
      cover_alt: str(row.cover_alt) || title,
      category: category || "free-patterns",
      tags: [...new Set(list(row.tags).map((t) => t.toLowerCase()))].slice(0, 20),
      difficulty: difficulty || null,
      yarn: str(row.yarn),
      hook: str(row.hook),
      gauge: str(row.gauge),
      finished_size: str(row.finished_size),
      time_estimate: str(row.time_estimate),
      materials: Array.isArray(row.materials) ? row.materials.map(str).filter(Boolean) : list(row.materials),
      abbreviations: str(row.abbreviations),
      pattern: await replacePhotoTokens(str(row.pattern), slug),
      faq: (Array.isArray(row.faq) ? row.faq : [])
        .map((f) => ({ q: str(f?.q), a: str(f?.a) }))
        .filter((f) => f.q && f.a),
      etsy_url: str(row.etsy_url),
      seo_title: str(row.seo_title),
      seo_description: str(row.seo_description),
      status,
      published_at: row.published_at
        ? new Date(row.published_at).toISOString()
        : status === "published"
          ? new Date().toISOString()
          : null,
    };

    if (APPLY) {
      const { error } = await supabase.from("posts").insert(post);
      if (error) throw new Error(error.message);
    }
    usedSlugs.add(slug);
    created++;
    console.log(`✔ ${APPLY ? "created" : "ok     "}  ${label}  → /blog/${slug}  [${post.category}, ${status}]`);
  } catch (e) {
    failed++;
    console.log(`✖ failed   ${label}  (${e.message})`);
  }
}

console.log(`\n${APPLY ? "Created" : "Ready to create"}: ${created}   Skipped: ${skipped}   Failed: ${failed}`);
if (failed) process.exitCode = 1;
