import type { FaqItem } from "./types";

/**
 * The one place that says what a valid post field is, so the single-post editor
 * and the bulk importer can never disagree about limits, formats or fallbacks.
 * Nothing here may import a client or a database, so both sides can use it.
 */

/** Mirrors `difficulties` in lib/categories.ts (kept here so this module stays dependency-free). */
export const DIFFICULTY_VALUES = ["beginner", "easy", "intermediate", "experienced"] as const;

export const LIMITS = {
  title: 200,
  slug: 120,
  excerpt: 500,
  content: 200000,
  cover_url: 1000,
  cover_alt: 300,
  yarn: 500,
  hook: 200,
  gauge: 300,
  finished_size: 300,
  time_estimate: 100,
  materials_text: 5000,
  abbreviations: 5000,
  pattern: 100000,
  faq_text: 20000,
  etsy_url: 1000,
  seo_title: 120,
  seo_description: 300,
  tags_text: 1000,
  MAX_TAGS: 20,
  MAX_MATERIALS: 50,
  MATERIAL_ITEM: 200,
  MAX_FAQ: 25,
  FAQ_Q: 300,
  FAQ_A: 2000,
  SEO_TITLE_TARGET: 60,
  SEO_DESC_TARGET: 160,
} as const;

export function capText(value: unknown, max: number) {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

/** Materials are ONE PER LINE. Commas belong inside an item ("cotton yarn, 100 yd"). */
export function parseMaterials(text: string): string[] {
  return String(text ?? "")
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, LIMITS.MAX_MATERIALS)
    .map((line) => line.slice(0, LIMITS.MATERIAL_ITEM));
}

function capFaq(pairs: FaqItem[]): FaqItem[] {
  return pairs
    .filter((p) => p.q && p.a)
    .slice(0, LIMITS.MAX_FAQ)
    .map((p) => ({ q: p.q.slice(0, LIMITS.FAQ_Q), a: p.a.slice(0, LIMITS.FAQ_A) }));
}

/**
 * FAQ text → pairs. The editor's format is primary ("Q: …" then "A: …"), with the
 * blank line between pairs optional, because Excel's Alt+Enter only gives one newline.
 * A single-line "Q: … | A: …" also works.
 */
export function parseFaqText(text: string): FaqItem[] {
  const lines = String(text ?? "")
    .replace(/\r/g, "")
    .split("\n");

  const pairs: FaqItem[] = [];
  let current: FaqItem | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^Q\s*:/i.test(line)) {
      if (current) pairs.push(current);
      const body = line.replace(/^Q\s*:\s*/i, "");
      const inline = body.match(/^([\s\S]*?)\s*\|?\s*\bA\s*:\s*([\s\S]*)$/i);
      current = inline ? { q: inline[1].trim(), a: inline[2].trim() } : { q: body.trim(), a: "" };
      continue;
    }
    if (/^A\s*:/i.test(line)) {
      const answer = line.replace(/^A\s*:\s*/i, "").trim();
      if (current) current.a = current.a ? `${current.a}\n${answer}` : answer;
      continue;
    }
    if (current) {
      if (current.a) current.a = `${current.a}\n${line}`;
      else current.q = `${current.q} ${line}`.trim();
    }
  }
  if (current) pairs.push(current);

  const primary = capFaq(pairs);
  if (primary.length) return primary;

  return capFaq(
    lines
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [qPart, aPart] = line.split("|");
        return {
          q: (qPart ?? "").replace(/^Q\s*:\s*/i, "").trim(),
          a: (aPart ?? "").replace(/^A\s*:\s*/i, "").trim(),
        };
      })
  );
}

export function parseTags(text: string): { tags: string[]; dropped: number } {
  const seen: string[] = [];
  for (const tag of String(text ?? "")
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)) {
    if (!seen.includes(tag)) seen.push(tag);
  }
  return { tags: seen.slice(0, LIMITS.MAX_TAGS), dropped: Math.max(0, seen.length - LIMITS.MAX_TAGS) };
}

export function normalizeDifficulty(value: unknown): { value: string | null; recognised: boolean } {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return { value: null, recognised: true };
  if ((DIFFICULTY_VALUES as readonly string[]).includes(raw)) return { value: raw, recognised: true };
  return { value: null, recognised: false };
}

const PUBLISHED_WORDS = ["published", "publish", "live", "yes", "true", "1", "on"];

export function normalizeStatus(value: unknown): { value: "published" | "draft"; recognised: boolean } {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!raw) return { value: "draft", recognised: true };
  if (PUBLISHED_WORDS.includes(raw)) return { value: "published", recognised: true };
  if (["draft", "no", "false", "0", "off"].includes(raw)) return { value: "draft", recognised: true };
  return { value: "draft", recognised: false };
}

/** Excel day number (1900 system) → milliseconds. */
function fromExcelSerial(serial: number) {
  return Math.round((serial - 25569) * 86400 * 1000);
}

export function parsePublishDate(value: string | Date | number | null | undefined): {
  iso: string | null;
  ok: boolean;
  wasBlank: boolean;
} {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time)
      ? { iso: null, ok: false, wasBlank: false }
      : { iso: value.toISOString(), ok: true, wasBlank: false };
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { iso: null, ok: false, wasBlank: false };
    const ms = value > 20000 && value < 80000 ? fromExcelSerial(value) : value;
    const date = new Date(ms);
    return Number.isNaN(date.getTime())
      ? { iso: null, ok: false, wasBlank: false }
      : { iso: date.toISOString(), ok: true, wasBlank: false };
  }

  const raw = String(value ?? "").trim();
  if (!raw) return { iso: null, ok: true, wasBlank: true };

  // "2026-11-05" and "2026-11-05 09:30" are read in the owner's time zone, like the editor's date field.
  const local = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/);
  if (local) {
    const date = new Date(
      Number(local[1]),
      Number(local[2]) - 1,
      Number(local[3]),
      Number(local[4] ?? 0),
      Number(local[5] ?? 0)
    );
    return Number.isNaN(date.getTime())
      ? { iso: null, ok: false, wasBlank: false }
      : { iso: date.toISOString(), ok: true, wasBlank: false };
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime())
    ? { iso: null, ok: false, wasBlank: false }
    : { iso: parsed.toISOString(), ok: true, wasBlank: false };
}

/* ------------------------------------------------------------------ */
/* [photo] placeholders in the article body                            */
/* ------------------------------------------------------------------ */

const PHOTO_TOKEN = /\[photo(?::(\d+))?\]/gi;
export const PHOTO_HEADING = "## Step-by-step photos";

export function countPhotoTokens(content: string) {
  return (String(content ?? "").match(PHOTO_TOKEN) ?? []).length;
}

function lastHeadingIsPhotos(text: string) {
  const headings = text.match(/^#{2,3}\s+.+$/gm);
  if (!headings?.length) return false;
  return /^#{2,3}\s+step-?by-?step photos\s*$/i.test(headings[headings.length - 1].trim());
}

/**
 * Replaces each [photo] / [photo:N] with a Markdown image, then appends whatever
 * is left under a trailing "Step-by-step photos" heading. A token with no photo
 * left is deleted, so a literal "[photo]" can never reach the live site.
 */
export function applyPhotoTokens(
  content: string,
  photos: { url: string; alt: string }[]
): { content: string; usedCount: number; tokenCount: number } {
  const used = new Set<number>();
  let tokenCount = 0;
  let next = 0;

  const replaced = String(content ?? "").replace(PHOTO_TOKEN, (_match, explicit?: string) => {
    tokenCount += 1;
    let index: number;
    if (explicit) {
      index = Number(explicit) - 1;
    } else {
      while (next < photos.length && used.has(next)) next += 1;
      index = next;
    }
    if (index < 0 || index >= photos.length || used.has(index)) return "";
    used.add(index);
    const photo = photos[index];
    return `\n\n![${photo.alt}](${photo.url})\n\n`;
  });

  let out = replaced.replace(/\n{3,}/g, "\n\n").trim();
  const leftovers = photos.filter((_, i) => !used.has(i));

  if (leftovers.length) {
    const block = leftovers.map((p) => `![${p.alt}](${p.url})`).join("\n\n");
    out = out
      ? lastHeadingIsPhotos(out)
        ? `${out}\n\n${block}`
        : `${out}\n\n${PHOTO_HEADING}\n\n${block}`
      : `${PHOTO_HEADING}\n\n${block}`;
  }

  return { content: out, usedCount: used.size, tokenCount };
}
