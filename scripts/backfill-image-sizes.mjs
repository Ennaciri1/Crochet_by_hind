// Adds the "#w=...&h=..." size hint to photos already inside your posts.
//
//   Preview (writes nothing):  npm run backfill:image-sizes
//   Really update the posts:   npm run backfill:image-sizes -- --apply
//
// Why: the reader's browser can only reserve the right space for a photo if it
// knows the photo's shape before it downloads it. Photos uploaded from /admin
// now carry their pixel size in the Markdown link; this script fills it in for
// the ones uploaded earlier.
//
// It only ever appends "#w=...&h=..." to an image link. The file in storage is
// not touched, renamed or re-uploaded, and the part of the link before the "#"
// stays byte-for-byte identical, so no image can break.
//
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (Supabase → Project Settings → API keys).

import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url) fail("NEXT_PUBLIC_SUPABASE_URL is missing from .env.local.");
if (!key) {
  fail(
    "SUPABASE_SERVICE_ROLE_KEY is missing from .env.local (Supabase → Project Settings → API keys → service_role).",
  );
}

/* ------------------------------------------------------------------ */
/* Reading a photo's pixel size from the first bytes of the file       */
/* ------------------------------------------------------------------ */

/** PNG: the IHDR chunk holds width and height right after the signature. */
function pngSize(buf) {
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

/** JPEG: walk the markers until a start-of-frame (SOFn) gives the size. */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i < buf.length - 9) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    // SOF0..SOF15, skipping the four markers in that range that are not frames.
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc, 0xd8].includes(marker)) {
      return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
    }
    const length = buf.readUInt16BE(i + 2);
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

/** WebP: the size lives in the VP8X, VP8L or lossy VP8 chunk. */
function webpSize(buf) {
  if (buf.length < 30 || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") {
    return { w: (buf.readUIntLE(24, 3) & 0xffffff) + 1, h: (buf.readUIntLE(27, 3) & 0xffffff) + 1 };
  }
  if (chunk === "VP8 ") {
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const bits = buf.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

/** The first 64 KB is plenty for every header above. */
async function readSize(src) {
  const response = await fetch(src, { headers: { Range: "bytes=0-65535" } });
  if (!response.ok && response.status !== 206) {
    throw new Error(`HTTP ${response.status}`);
  }
  const buf = Buffer.from(await response.arrayBuffer());
  const size = pngSize(buf) ?? jpegSize(buf) ?? webpSize(buf);
  if (!size || !size.w || !size.h) throw new Error("could not read the pixel size");
  return size;
}

/* ------------------------------------------------------------------ */
/* Rewriting the posts                                                 */
/* ------------------------------------------------------------------ */

const IMAGE_LINK = /!\[([^\]]*)\]\(([^)\s]+)([^)]*)\)/g;

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { data: posts, error } = await supabase.from("posts").select("id, slug, title, content");
if (error) fail(`Could not read the posts: ${error.message}`);

console.log(`\n${APPLY ? "Updating" : "Previewing"} ${posts.length} post(s).\n`);

let totalSized = 0;
let totalSkipped = 0;
let totalFailed = 0;
const updates = [];

for (const post of posts) {
  const links = [...(post.content ?? "").matchAll(IMAGE_LINK)];
  if (links.length === 0) continue;

  const sizes = new Map();
  let sized = 0;
  let skipped = 0;
  let failed = 0;

  for (const [, , href] of links) {
    if (sizes.has(href)) continue;
    // Already has a hint, or is not a file we can measure over HTTP.
    if (href.includes("#w=") || !/^https?:\/\//.test(href) || /\.svg($|[?#])/i.test(href)) {
      skipped += 1;
      continue;
    }
    try {
      const size = await readSize(href);
      sizes.set(href, size);
      sized += 1;
    } catch (e) {
      console.log(`  ! ${post.slug}: ${href.split("/").pop()} — ${e.message}`);
      failed += 1;
    }
  }

  if (sizes.size === 0) {
    totalSkipped += skipped;
    totalFailed += failed;
    continue;
  }

  const content = post.content.replace(IMAGE_LINK, (match, alt, href, rest) => {
    const size = sizes.get(href);
    return size ? `![${alt}](${href}#w=${size.w}&h=${size.h}${rest})` : match;
  });

  console.log(`  ${post.slug}: ${sized} photo(s) measured, ${skipped} already done, ${failed} failed`);
  for (const [href, size] of sizes) {
    console.log(`      ${size.w}x${size.h}  ${href.split("/").pop()}`);
  }

  updates.push({ id: post.id, content });
  totalSized += sized;
  totalSkipped += skipped;
  totalFailed += failed;
}

console.log(
  `\n${totalSized} photo(s) measured · ${totalSkipped} already had a size · ${totalFailed} could not be read`,
);

if (!APPLY) {
  console.log(
    updates.length > 0
      ? `\nNothing was written. Run "npm run backfill:image-sizes -- --apply" to update ${updates.length} post(s).\n`
      : "\nNothing to do.\n",
  );
  process.exit(0);
}

for (const update of updates) {
  const { error: writeError } = await supabase
    .from("posts")
    .update({ content: update.content })
    .eq("id", update.id);
  if (writeError) console.error(`  ✖ ${update.id}: ${writeError.message}`);
}

console.log(`\n✔ Updated ${updates.length} post(s). The site refreshes within 5 minutes.\n`);
