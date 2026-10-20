"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import type { Category } from "@/lib/categories";
import { slugify } from "@/lib/markdown";
import {
  applyPhotoTokens,
  capText,
  countPhotoTokens,
  LIMITS,
  normalizeDifficulty,
  normalizeStatus,
  parseFaqText,
  parseMaterials,
  parsePublishDate,
  parseTags,
} from "@/lib/post-fields";
import { ACCEPT_ATTR, altFromFilename, assertUploadable, readImageSize, uploadImage } from "@/lib/upload";
import { getExistingSlugs, importPosts, type ImportResult, type ImportRow } from "../../actions";

const MAX_ROWS = 200;
const MAX_EXCEL_BYTES = 5 * 1024 * 1024;
const SAVE_CHUNK = 10;
const UPLOAD_CONCURRENCY = 4;
const IMG_EXT = "(?:jpe?g|png|webp|avif)";
const FALLBACK_CATEGORY = "free-patterns";

/** The spreadsheet columns, in the same order as the panels of the single-post editor. */
const HEADER_KEYS = [
  "title",
  "slug",
  "excerpt",
  "content",
  "cover_photo",
  "cover_alt",
  "photos",
  "photo_alts",
  "difficulty",
  "time_estimate",
  "yarn",
  "hook",
  "gauge",
  "finished_size",
  "materials",
  "abbreviations",
  "pattern",
  "faq",
  "category",
  "tags",
  "etsy_url",
  "seo_title",
  "seo_description",
  "status",
  "published_at",
] as const;

type HeaderKey = (typeof HEADER_KEYS)[number];

const COLUMN_WIDTH: Record<HeaderKey, number> = {
  title: 34,
  slug: 26,
  excerpt: 45,
  content: 70,
  cover_photo: 26,
  cover_alt: 26,
  photos: 45,
  photo_alts: 45,
  difficulty: 14,
  time_estimate: 14,
  yarn: 26,
  hook: 26,
  gauge: 26,
  finished_size: 26,
  materials: 45,
  abbreviations: 45,
  pattern: 70,
  faq: 70,
  category: 18,
  tags: 26,
  etsy_url: 34,
  seo_title: 34,
  seo_description: 45,
  status: 14,
  published_at: 14,
};

type Level = "blocked" | "warn" | "info";
type Warning = { level: Level; text: string };

type SelectedPhoto = {
  id: number;
  file: File;
  name: string;
  lower: string;
  relPath: string;
  previewUrl: string;
  w?: number;
  h?: number;
};

type SheetRow = {
  index: number;
  sheetRow: number;
  cells: Record<string, string>;
  row: ImportRow;
  slug: string;
  isExample: boolean;
  tokenCount: number;
  warnings: Warning[];
  coverCell: string;
  photoCells: string[];
  photoAlts: string[];
};

type ResolvedRow = SheetRow & {
  finalSlug: string;
  warnings: Warning[];
  blocked: boolean;
  include: boolean;
  coverFile?: SelectedPhoto;
  coverUrlFromCell?: string;
  coverGuessed: boolean;
  bodyPhotos: SelectedPhoto[];
  bodyAlts: string[];
};

type HeaderInfo = {
  sheetName: string;
  found: HeaderKey[];
  unknown: string[];
  missing: HeaderKey[];
  hasTitle: boolean;
};

type Override = { coverId?: number | null; excluded?: boolean; dropped?: number[] };
type UploadFailure = { sheetRow: number; filename: string; message: string };
type CellValue = string | Date;

/* ------------------------------------------------------------------ */
/* Reading the workbook                                                */
/* ------------------------------------------------------------------ */

function normalizeHeader(value: string) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

/**
 * Every cell as the text the owner actually typed (so "4/5" stays "4/5" and
 * leading zeros survive), except real date cells, which stay Date objects.
 */
function readCells(sheet: XLSX.WorkSheet): CellValue[][] {
  const ref = sheet["!ref"];
  if (!ref) return [];
  const range = XLSX.utils.decode_range(ref);
  const out: CellValue[][] = [];

  for (let r = range.s.r; r <= range.e.r; r += 1) {
    const row: CellValue[] = [];
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      if (!cell) {
        row.push("");
        continue;
      }
      if (cell.t === "d" && cell.v instanceof Date) {
        row.push(cell.v);
        continue;
      }
      row.push(String(cell.w ?? cell.v ?? "").trim());
    }
    out.push(row);
  }
  return out;
}

function asText(value: CellValue | undefined) {
  if (value instanceof Date) return value.toISOString().slice(0, 16).replace("T", " ");
  return String(value ?? "").trim();
}

function splitList(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function lines(value: string) {
  return value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/* ------------------------------------------------------------------ */
/* One sheet → rows                                                    */
/* ------------------------------------------------------------------ */

function parseSheet(sheet: XLSX.WorkSheet, sheetName: string, categories: Category[]) {
  const grid = readCells(sheet);
  const headerCells = grid[0] ?? [];
  const headers = headerCells.map((cell) => normalizeHeader(asText(cell)));

  const known = new Set<string>(HEADER_KEYS);
  const found = HEADER_KEYS.filter((key) => headers.includes(key));
  const unknown = headers.filter((h) => h && !known.has(h));
  const header: HeaderInfo = {
    sheetName,
    found,
    unknown,
    missing: HEADER_KEYS.filter((key) => !headers.includes(key)),
    hasTitle: headers.includes("title"),
  };

  const categorySlugs = categories.map((c) => c.slug);
  const rows: SheetRow[] = [];

  grid.slice(1).forEach((cellRow, i) => {
    const sheetRow = i + 2;
    if (cellRow.every((cell) => asText(cell) === "")) return;

    const raw: Record<string, CellValue> = {};
    headers.forEach((key, c) => {
      if (key) raw[key] = cellRow[c] ?? "";
    });
    const cells: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) cells[key] = asText(value);

    const warnings: Warning[] = [];
    const push = (level: Level, text: string) => warnings.push({ level, text });

    const title = cells.title ?? "";
    const isExample = /^example/i.test(title);
    if (!title) push("blocked", `Row ${sheetRow} has no title, so it cannot be imported.`);
    if (isExample) push("info", "This is the example row from the template, so it will be skipped.");

    const slug = slugify(cells.slug || title);
    if (title && !slug) push("blocked", "A web address could not be built from this title — please fill the slug column.");

    // Excel loves turning "4/5" or "2-3" into a date; the serial number is what survives.
    for (const key of ["gauge", "finished_size", "time_estimate", "yarn", "hook", "title", "excerpt"] as const) {
      if (/^\d{5}$/.test(cells[key] ?? "")) {
        push(
          "warn",
          `Excel seems to have changed the ${key} cell into a date (it now reads "${cells[key]}"). Format that column as Text and type it again.`
        );
      }
    }

    const categoryInput = (cells.category ?? "").toLowerCase();
    const matched = categories.find((c) => c.slug.toLowerCase() === categoryInput || c.name.toLowerCase() === categoryInput);
    if (categoryInput && !matched) {
      push(
        "warn",
        `The category "${cells.category}" is not one of yours, so "Free patterns" will be used. Your categories: ${categorySlugs.join(", ")}.`
      );
    }

    const difficulty = normalizeDifficulty(cells.difficulty);
    if (!difficulty.recognised) {
      push(
        "warn",
        `The skill level "${cells.difficulty}" was not recognised, so the pattern card will show none. Use beginner, easy, intermediate or experienced.`
      );
    }

    const status = normalizeStatus(cells.status);
    if (!status.recognised) {
      push(
        "warn",
        `The status "${cells.status}" was not recognised, so this row will be saved as a draft. Use published (or live, yes, true, 1) or draft.`
      );
    }

    const date = parsePublishDate(raw.published_at ?? "");
    if (!date.ok) {
      push("warn", `The publish date "${cells.published_at}" could not be read. Use 2026-11-05 or 2026-11-05 09:30.`);
    }
    const scheduled = date.iso ? new Date(date.iso).getTime() > Date.now() : false;
    if (scheduled && status.value === "draft") {
      push("info", "This row has a future date but its status is draft, so it will stay a draft.");
    }

    const materialLines = lines(cells.materials ?? "");
    if (materialLines.length > LIMITS.MAX_MATERIALS) {
      push("warn", `Only the first ${LIMITS.MAX_MATERIALS} materials are kept (${materialLines.length} were listed).`);
    }

    const faq = parseFaqText(cells.faq ?? "");
    if ((cells.faq ?? "") && faq.length === 0) {
      push(
        "warn",
        'The faq cell has text but no question could be read. Write "Q: your question" on one line and "A: your answer" on the next.'
      );
    }

    const tags = parseTags(cells.tags ?? "");
    if (tags.dropped > 0) push("warn", `Only the first ${LIMITS.MAX_TAGS} tags are kept — ${tags.dropped} were dropped.`);

    const etsy = cells.etsy_url ?? "";
    if (etsy && !/^https?:\/\//i.test(etsy)) {
      push("warn", "The Etsy link must start with http:// or https://, so it will be left out.");
    }

    const overLength: [string, string, number][] = [
      ["excerpt", cells.excerpt ?? "", LIMITS.excerpt],
      ["yarn", cells.yarn ?? "", LIMITS.yarn],
      ["hook", cells.hook ?? "", LIMITS.hook],
      ["gauge", cells.gauge ?? "", LIMITS.gauge],
      ["finished_size", cells.finished_size ?? "", LIMITS.finished_size],
      ["time_estimate", cells.time_estimate ?? "", LIMITS.time_estimate],
      ["cover_alt", cells.cover_alt ?? "", LIMITS.cover_alt],
      ["seo_title", cells.seo_title ?? "", LIMITS.seo_title],
      ["seo_description", cells.seo_description ?? "", LIMITS.seo_description],
      ["content", cells.content ?? "", LIMITS.content],
      ["pattern", cells.pattern ?? "", LIMITS.pattern],
      ["abbreviations", cells.abbreviations ?? "", LIMITS.abbreviations],
      ["title", title, LIMITS.title],
    ];
    for (const [label, value, max] of overLength) {
      if (value.length > max) push("warn", `${label} is ${value.length} characters and will be cut at ${max}.`);
    }
    if ((cells.seo_title ?? "").length > LIMITS.SEO_TITLE_TARGET) {
      push("warn", `The SEO title is ${cells.seo_title.length} characters — Google usually shows about ${LIMITS.SEO_TITLE_TARGET}.`);
    }
    if ((cells.seo_description ?? "").length > LIMITS.SEO_DESC_TARGET) {
      push(
        "warn",
        `The SEO description is ${cells.seo_description.length} characters — Google usually shows about ${LIMITS.SEO_DESC_TARGET}.`
      );
    }

    const row: ImportRow = {
      title: capText(title, LIMITS.title),
      slug,
      excerpt: capText(cells.excerpt, LIMITS.excerpt),
      content: cells.content ?? "",
      cover_alt: capText(cells.cover_alt, LIMITS.cover_alt),
      category: matched ? matched.slug : FALLBACK_CATEGORY,
      tags: tags.tags,
      difficulty: difficulty.value,
      yarn: capText(cells.yarn, LIMITS.yarn),
      hook: capText(cells.hook, LIMITS.hook),
      gauge: capText(cells.gauge, LIMITS.gauge),
      finished_size: capText(cells.finished_size, LIMITS.finished_size),
      time_estimate: capText(cells.time_estimate, LIMITS.time_estimate),
      materials: parseMaterials(cells.materials ?? ""),
      abbreviations: capText(cells.abbreviations, LIMITS.abbreviations),
      pattern: capText(cells.pattern, LIMITS.pattern),
      faq,
      etsy_url: /^https?:\/\//i.test(etsy) ? capText(etsy, LIMITS.etsy_url) : "",
      seo_title: capText(cells.seo_title, LIMITS.seo_title),
      seo_description: capText(cells.seo_description, LIMITS.seo_description),
      status: status.value,
      published_at: date.iso ?? "",
      row_number: sheetRow,
    };

    rows.push({
      index: rows.length,
      sheetRow,
      cells,
      row,
      slug,
      isExample,
      tokenCount: countPhotoTokens(cells.content ?? ""),
      warnings,
      coverCell: cells.cover_photo ?? "",
      photoCells: splitList(cells.photos ?? ""),
      photoAlts: lines(cells.photo_alts ?? ""),
    });
  });

  return { rows, header };
}

/* ------------------------------------------------------------------ */
/* Photos → rows (the naming convention, no fuzzy matching)            */
/* ------------------------------------------------------------------ */

function byName(photos: SelectedPhoto[], name: string) {
  const target = name.trim().toLowerCase();
  return photos.find((p) => p.lower === target || p.relPath.toLowerCase() === target);
}

function resolveRows(
  sheetRows: SheetRow[],
  photos: SelectedPhoto[],
  existingSlugs: string[],
  onDuplicate: "skip" | "suffix",
  overrides: Record<number, Override>
): { rows: ResolvedRow[]; unusedPhotos: SelectedPhoto[] } {
  const taken = new Set(existingSlugs);
  const seenInFile = new Set<string>();
  const used = new Set<number>();
  const resolved: ResolvedRow[] = [];

  for (const base of sheetRows) {
    const ov = overrides[base.index] ?? {};
    const warnings: Warning[] = [...base.warnings];
    const push = (level: Level, text: string) => warnings.push({ level, text });
    const slug = base.slug;

    /* ---- duplicates ---- */
    let finalSlug = slug;
    if (slug) {
      const inFile = seenInFile.has(slug);
      const inDatabase = taken.has(slug);
      if (inFile || inDatabase) {
        const reason = inFile
          ? `The web address /blog/${slug} is used by two rows of your file.`
          : `A post already uses /blog/${slug}.`;
        if (onDuplicate === "skip") {
          push("blocked", `${reason} This row will be skipped — choose “Create them anyway” below to import it with -2 at the end.`);
        } else {
          let n = 2;
          finalSlug = `${slug}-${n}`;
          while (taken.has(finalSlug)) {
            n += 1;
            finalSlug = `${slug}-${n}`;
          }
          push("warn", `${reason} It will be created as /blog/${finalSlug}.`);
        }
      }
      seenInFile.add(slug);
      if (onDuplicate === "suffix") taken.add(finalSlug);
    }

    /* ---- in-article photos ---- */
    const bodyPhotos: SelectedPhoto[] = [];
    if (base.photoCells.length > 0) {
      for (const name of base.photoCells) {
        const photo = byName(photos, name);
        if (photo) bodyPhotos.push(photo);
        else if (photos.length) push("warn", `photos: "${name}" is not one of the photos you selected.`);
      }
    } else if (slug) {
      const numbered: { n: number; photo: SelectedPhoto }[] = [];
      const extra: SelectedPhoto[] = [];
      const numberRe = new RegExp(`^${slug}-(\\d+)\\.${IMG_EXT}$`, "i");
      const otherRe = new RegExp(`^${slug}-(?!cover\\.)[^.]+\\.${IMG_EXT}$`, "i");

      for (const photo of photos) {
        const match = photo.lower.match(numberRe);
        if (match) {
          numbered.push({ n: Number(match[1]), photo });
          continue;
        }
        if (otherRe.test(photo.lower)) extra.push(photo);
      }
      numbered.sort((a, b) => a.n - b.n);
      extra.sort((a, b) => a.lower.localeCompare(b.lower));

      for (let i = 1; i < numbered.length; i += 1) {
        if (numbered[i].n > numbered[i - 1].n + 1) {
          push("info", `Photo numbers jump from ${numbered[i - 1].n} to ${numbered[i].n} — they are still used in order.`);
        }
      }
      if (extra.length) {
        push(
          "info",
          `${extra.length} photo(s) without a number come after the numbered ones: ${extra.map((p) => p.name).join(", ")}.`
        );
      }
      bodyPhotos.push(...numbered.map((item) => item.photo), ...extra);
    }

    const dropped = new Set(ov.dropped ?? []);
    const keptBody = bodyPhotos.filter((p) => !dropped.has(p.id));

    /* ---- cover ---- */
    let coverFile: SelectedPhoto | undefined;
    let coverUrlFromCell: string | undefined;
    let coverGuessed = false;

    if (ov.coverId === null) {
      coverFile = undefined;
    } else if (typeof ov.coverId === "number") {
      coverFile = photos.find((p) => p.id === ov.coverId);
    } else if (/^https?:\/\//i.test(base.coverCell)) {
      coverUrlFromCell = base.coverCell;
    } else if (base.coverCell) {
      coverFile = byName(photos, base.coverCell);
      if (!coverFile) push("warn", `cover_photo "${base.coverCell}" is not one of the photos you selected.`);
    } else if (slug) {
      const coverRe = new RegExp(`^${slug}-cover\\.${IMG_EXT}$`, "i");
      const plainRe = new RegExp(`^${slug}\\.${IMG_EXT}$`, "i");
      coverFile = photos.find((p) => coverRe.test(p.lower)) ?? photos.find((p) => plainRe.test(p.lower));
      if (!coverFile) {
        const guesses = photos.filter((p) => !keptBody.includes(p) && slugify(p.name.replace(/\.[^.]+$/, "")).includes(slug));
        if (guesses.length === 1) {
          coverFile = guesses[0];
          coverGuessed = true;
          push("info", `The cover photo was guessed from "${coverFile.name}" — please check it.`);
        }
      }
    }

    if (!coverFile && !coverUrlFromCell && photos.length > 0) {
      push(
        "warn",
        `No cover photo found. Name one photo "${slug || "your-slug"}-cover.jpg" and add it above — without a cover the post shows an empty box on the homepage and cannot be pinned.`
      );
    }
    if (coverFile && coverFile.w && coverFile.h && coverFile.w > coverFile.h) {
      push(
        "warn",
        `This cover photo is ${coverFile.w}x${coverFile.h} — the top and bottom will be cut off by the 4:5 crop. A portrait photo (e.g. 1000x1250) looks best.`
      );
    }
    if ((coverFile || coverUrlFromCell) && !base.cells.cover_alt) {
      push("warn", "cover_alt is empty, so the alt text will fall back to the title.");
    }

    /* ---- alt text for the in-article photos ---- */
    const bodyAlts = keptBody.map((photo, i) => {
      const fromCell = base.photoAlts[i] ?? "";
      if (fromCell) return fromCell;
      const derived = altFromFilename(photo.name, slug);
      if (!derived) push("warn", `Photo ${i + 1} (${photo.name}) has no description, so it will have empty alt text.`);
      return derived;
    });

    if (base.tokenCount > keptBody.length) {
      push(
        "warn",
        `The content cell has ${base.tokenCount} [photo] marks but only ${keptBody.length} photo(s) were found — the extra marks are removed.`
      );
    }
    if (keptBody.length > base.tokenCount) {
      const surplus = keptBody.length - base.tokenCount;
      push("info", `${surplus} photo(s) are added at the end under "Step-by-step photos".`);
    }

    if (coverFile) used.add(coverFile.id);
    for (const photo of keptBody) used.add(photo.id);

    const blocked = warnings.some((w) => w.level === "blocked") || base.isExample;
    resolved.push({
      ...base,
      warnings,
      finalSlug: finalSlug || slug,
      blocked,
      include: !blocked && !ov.excluded,
      coverFile,
      coverUrlFromCell,
      coverGuessed,
      bodyPhotos: keptBody,
      bodyAlts,
    });
  }

  return { rows: resolved, unusedPhotos: photos.filter((p) => !used.has(p.id)) };
}

/* ------------------------------------------------------------------ */
/* The Excel template                                                  */
/* ------------------------------------------------------------------ */

const SAMPLE: Record<HeaderKey, string> = {
  title: "EXAMPLE ROW - DELETE THIS LINE BEFORE IMPORTING",
  slug: "cozy-amigurumi-bunny",
  excerpt: "A quick, beginner-friendly amigurumi bunny worked in the round with worsted weight cotton yarn.",
  content: `Make this little bunny in one evening with yarn you already have in your basket. It is worked in the round, so there are no seams to sew at the end.

## Why you will love this pattern

- Quick: about 2-3 hours from start to finish
- Beginner friendly: magic ring, single crochet, increase, decrease
- Makes a lovely baby gift

[photo]

## Making the body

Start at the bottom of the body and work in a spiral, counting your stitches at the end of every round.

[photo]

## Finishing

Stuff the body firmly, close the opening and sew the ears on with a yarn needle.`,
  cover_photo: "",
  cover_alt: "Cream crochet bunny sitting next to a ball of cotton yarn",
  photos: "",
  photo_alts: `stuffing the head
sewing on the ears`,
  difficulty: "beginner",
  time_estimate: "2-3 hours",
  yarn: "Worsted weight (4) cotton yarn",
  hook: "5 mm (H-8) crochet hook",
  gauge: "Gauge is not critical for this pattern",
  finished_size: "About 15 cm (6 in) tall",
  materials: `Worsted weight cotton yarn, about 100 yd
5 mm (H-8) crochet hook
Stitch marker
Yarn needle
Scissors
Toy stuffing`,
  abbreviations: `ch - chain
sc - single crochet
inc - increase
dec - decrease
MR - magic ring
FO - fasten off`,
  pattern: `**Rnd 1:** Make a MR, 6 sc in the ring. *(6 sts)*

**Rnd 2:** Inc in each st around. *(12 sts)*

**Finishing:** FO and weave in the ends.`,
  faq: `Q: What yarn can I use instead?
A: Any worsted weight (4) yarn works. Check your gauge first.

Q: Can I sell what I make from this pattern?
A: Yes, you may sell finished items you made yourself. Please credit this site.`,
  category: "amigurumi",
  tags: "amigurumi, bunny, easy",
  etsy_url: "",
  seo_title: "Cozy Amigurumi Bunny - Free Crochet Pattern",
  seo_description: "Free, beginner-friendly amigurumi bunny crochet pattern with step-by-step photos and instructions.",
  status: "draft",
  published_at: "",
};

const COLUMN_NOTES: [HeaderKey, string, string, string, string][] = [
  ["title", "The post title, shown as the big heading.", "Required", "Any text, up to 200 characters.", "Cozy Amigurumi Bunny"],
  [
    "slug",
    "The web address: /blog/your-slug. It is also the name your photo files must start with.",
    "Optional",
    "Lowercase letters, numbers and dashes. Leave empty to build it from the title.",
    "cozy-amigurumi-bunny",
  ],
  ["excerpt", "1-2 sentences under the title and on post cards.", "Optional", "Up to 500 characters.", "A quick bunny for beginners."],
  [
    "content",
    "The article itself, in Markdown.",
    "Optional",
    "Markdown (see Markdown basics below). Write [photo] where a photo should appear.",
    "## Why you will love this ...",
  ],
  [
    "cover_photo",
    "Forces which photo becomes the cover.",
    "Optional",
    "One exact file name, or a full https:// link. Wins over the file-name rule.",
    "cozy-amigurumi-bunny-cover.jpg",
  ],
  [
    "cover_alt",
    "Describes the cover photo for Google and for screen readers.",
    "Optional",
    "Up to 300 characters. Leave empty and the title is used instead.",
    "Cream crochet bunny next to a ball of yarn",
  ],
  [
    "photos",
    "Forces which photos go inside the article, and in which order.",
    "Optional",
    "File names, one per line (Alt+Enter) or separated by commas. Wins over the -1, -2, -3 rule.",
    "IMG_4821.jpg\nIMG_4822.jpg",
  ],
  [
    "photo_alts",
    "Describes each in-article photo.",
    "Optional",
    "One sentence per line, matched by position to photos / to -1, -2, -3.",
    "stuffing the head\nsewing on the ears",
  ],
  ["difficulty", "The skill level on the pattern card.", "Optional", "beginner, easy, intermediate or experienced.", "beginner"],
  ["time_estimate", "How long the project takes.", "Optional", "Any short text.", "2-3 hours"],
  ["yarn", "The yarn line of the pattern card.", "Optional", "Any text, up to 500 characters.", "Worsted weight (4) cotton, 100 yd"],
  ["hook", "The hook line of the pattern card.", "Optional", "Any text, up to 200 characters.", "5 mm (H-8)"],
  ["gauge", "The gauge line of the pattern card.", "Optional", "Any text. Format the column as Text so Excel keeps 4/5 as text.", "16 sc x 18 rows = 4 in"],
  ["finished_size", "The finished measurements.", "Optional", "Any text, up to 300 characters.", "About 15 cm (6 in) tall"],
  [
    "materials",
    "The shopping list on the pattern card.",
    "Optional",
    "ONE ITEM PER LINE (Alt+Enter). Commas stay inside an item.",
    "Worsted weight cotton yarn, 100 yd\n5 mm hook",
  ],
  [
    "abbreviations",
    "The abbreviation list on the pattern card.",
    "Optional",
    "One per line, US terms, with a SPACE on each side of the dash.",
    "sc - single crochet",
  ],
  [
    "pattern",
    "The written instructions on the pattern card.",
    "Optional",
    "Markdown, one round per paragraph. Leave EMPTY for a tutorial with no pattern card.",
    "**Rnd 1:** 6 sc in a MR. *(6 sts)*",
  ],
  [
    "faq",
    "Questions and answers shown under the article.",
    "Optional",
    'Write "Q: question" on one line and "A: answer" on the next (Alt+Enter). Repeat for each question.',
    "Q: Which yarn?\nA: Any worsted weight.",
  ],
  [
    "category",
    "Which category page the post appears on.",
    "Optional",
    "One of the slugs on the Choices sheet. Anything else becomes free-patterns.",
    "amigurumi",
  ],
  ["tags", "Small keyword chips on the post.", "Optional", "Separated by commas, at most 20.", "amigurumi, bunny, easy"],
  ["etsy_url", "Link to the ad-free PDF for THIS post.", "Optional", "Must start with https://. Leave empty to link to your shop.", "https://www.etsy.com/listing/123"],
  [
    "seo_title",
    "The title Google shows.",
    "Optional",
    `Aim for ${LIMITS.SEO_TITLE_TARGET} characters. Leave empty to reuse the title.`,
    "Cozy Amigurumi Bunny - Free Pattern",
  ],
  [
    "seo_description",
    "The description Google shows.",
    "Optional",
    `Aim for ${LIMITS.SEO_DESC_TARGET} characters.`,
    "Free beginner amigurumi bunny pattern with photos.",
  ],
  ["status", "Live on the site, or saved for review.", "Optional", "published (or live, yes, true, 1) / draft. Empty = draft.", "draft"],
  [
    "published_at",
    "When the post goes live.",
    "Optional",
    "2026-11-05 or 2026-11-05 09:30. A FUTURE date schedules the post. Empty = now (when status is published).",
    "2026-11-05 09:30",
  ],
];

function buildTemplateWorkbook(categories: Category[]) {
  const headerRow = [...HEADER_KEYS];
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, headerRow.map((key) => SAMPLE[key])]);
  sheet["!cols"] = headerRow.map((key) => ({ wch: COLUMN_WIDTH[key] }));
  sheet["!rows"] = [{ hpt: 20 }, { hpt: 160 }];
  sheet["!freeze"] = { xSplit: 0, ySplit: 1 };
  sheet["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headerRow.length - 1 } }) };

  const notes: (string | number)[][] = [
    ["HOW TO FILL THIS IN"],
    [
      "Some cells contain several lines. Turn on Home > Wrap Text to read them properly, and press Alt+Enter (Option+Enter on Mac) to start a new line inside a cell.",
    ],
    ["Row 2 of the Posts sheet is an example — DELETE IT before importing."],
    [],
    ["PHOTOS — how to name your files"],
    [
      "Name every photo after the post's web address: cozy-amigurumi-bunny-cover.jpg is the big photo at the top, and cozy-amigurumi-bunny-1.jpg, cozy-amigurumi-bunny-2.jpg, cozy-amigurumi-bunny-3.jpg are the photos inside the article, in that number order. Write [photo] in the content cell wherever you want the next one to appear — if you write none, they are all added at the end under a 'Step-by-step photos' heading.",
    ],
    ["File name", "What it becomes"],
    ["cozy-amigurumi-bunny-cover.jpg", "the cover photo at the top of the post"],
    ["cozy-amigurumi-bunny.jpg", "also accepted as the cover photo"],
    ["cozy-amigurumi-bunny-1.jpg", "the first photo inside the article"],
    ["cozy-amigurumi-bunny-2.jpg", "the second photo inside the article"],
    ["[photo]", "replaced by the next photo that has not been used yet"],
    ["[photo:3]", "replaced by photo number 3 exactly, so you can reorder without renaming"],
    ["No [photo] at all", "every photo is added at the end under a '## Step-by-step photos' heading"],
    ["Priority", "if you fill cover_photo or photos, those win over the file names"],
    [
      "Format",
      "photos must be JPG, PNG, WebP or AVIF, portrait 4:5 (e.g. 1000x1250), under 10 MB each — iPhone HEIC files are not supported",
    ],
    ["Zero padding", "cozy-amigurumi-bunny-01.jpg is the same as cozy-amigurumi-bunny-1.jpg"],
    [],
    ["MARKDOWN BASICS — used by the content AND pattern columns"],
    ["## Heading", "a section heading (it also appears in the table of contents)"],
    ["**bold**", "bold text"],
    ["- list item", "a bullet list (one item per line)"],
    ["[link](https://example.com)", "a link"],
    ["Blank line", "leave a blank line between paragraphs, or they join into one"],
    [],
    ["THE COLUMNS (same order as the Posts sheet)"],
    ["Column", "What it is", "Required?", "Accepted values / format", "Example"],
    ...COLUMN_NOTES.map(([key, what, required, accepted, example]) => [key, what, required, accepted, example]),
    [],
    ["LIMITS AND RULES"],
    [`At most ${MAX_ROWS} rows and 5 MB per file.`],
    ["Keep the header row exactly as printed — renaming a header makes that column disappear."],
    ["Keep the sheet named 'Posts'. Other sheets are ignored."],
    ["Photos: JPG, PNG, WebP or AVIF, under 10 MB each, portrait 4:5."],
    ["Materials and abbreviations: one item per line. Abbreviations need a space on each side of the dash: sc - single crochet."],
    ["Nothing is saved until you press Import in the admin, after checking the preview."],
  ];
  const notesSheet = XLSX.utils.aoa_to_sheet(notes);
  notesSheet["!cols"] = [{ wch: 34 }, { wch: 46 }, { wch: 12 }, { wch: 56 }, { wch: 38 }];

  const choices: (string | number)[][] = [
    ["category (copy one of these)", "difficulty", "status"],
    ...Array.from({ length: Math.max(categories.length, 4) }, (_, i) => [
      categories[i]?.slug ?? "",
      ["beginner", "easy", "intermediate", "experienced"][i] ?? "",
      ["published", "draft"][i] ?? "",
    ]),
  ];
  const choicesSheet = XLSX.utils.aoa_to_sheet(choices);
  choicesSheet["!cols"] = [{ wch: 30 }, { wch: 18 }, { wch: 14 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Posts");
  XLSX.utils.book_append_sheet(wb, notesSheet, "How to fill this in");
  XLSX.utils.book_append_sheet(wb, choicesSheet, "Choices");
  return wb;
}

function downloadRowsWorkbook(rows: Record<string, string>[], filename: string) {
  const headerRow = [...HEADER_KEYS];
  const sheet = XLSX.utils.aoa_to_sheet([headerRow, ...rows.map((r) => headerRow.map((key) => r[key] ?? ""))]);
  sheet["!cols"] = headerRow.map((key) => ({ wch: COLUMN_WIDTH[key] }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Posts");
  XLSX.writeFile(wb, filename);
}

/* ------------------------------------------------------------------ */
/* Misc helpers                                                        */
/* ------------------------------------------------------------------ */

async function runWithLimit<T>(items: T[], limit: number, worker: (item: T) => Promise<void>) {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(runners);
}

/** ".../object/public/images/posts/slug/123-photo.jpg" → "posts/slug/123-photo.jpg" */
function storagePath(url: string) {
  const marker = "/images/";
  const at = url.indexOf(marker);
  return at >= 0 ? url.slice(at + marker.length) : url;
}

function message(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong.";
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function ImportForm({ categories }: { categories: Category[] }) {
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);
  const [header, setHeader] = useState<HeaderInfo | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [excelName, setExcelName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);

  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [rejected, setRejected] = useState<{ name: string; reason: string }[]>([]);
  const [overrides, setOverrides] = useState<Record<number, Override>>({});
  const [existingSlugs, setExistingSlugs] = useState<string[]>([]);
  const [onDuplicate, setOnDuplicate] = useState<"skip" | "suffix">("skip");

  const [templateDownloaded, setTemplateDownloaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null);
  const [uploadFailures, setUploadFailures] = useState<UploadFailure[] | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [orphans, setOrphans] = useState<Record<number, string[]>>({});
  const [retryCells, setRetryCells] = useState<Record<string, string>[]>([]);
  const [failuresOnly, setFailuresOnly] = useState(false);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const photosInputRef = useRef<HTMLInputElement>(null);
  const workbookRef = useRef<XLSX.WorkBook | null>(null);
  const photoIdRef = useRef(1);
  const uploadedRef = useRef<Map<number, string>>(new Map());
  const failedPhotoRef = useRef<Map<number, string>>(new Map());
  const cancelRef = useRef(false);
  const livePhotosRef = useRef<SelectedPhoto[]>([]);
  livePhotosRef.current = photos;

  useEffect(() => () => livePhotosRef.current.forEach((p) => URL.revokeObjectURL(p.previewUrl)), []);

  const { rows, unusedPhotos } = useMemo(
    () => resolveRows(sheetRows, photos, existingSlugs, onDuplicate, overrides),
    [sheetRows, photos, existingSlugs, onDuplicate, overrides]
  );

  const importable = rows.filter((r) => r.include);
  const readyCount = importable.filter((r) => r.warnings.length === 0).length;
  const warnCount = importable.length - readyCount;
  const skippedCount = rows.length - importable.length;
  const liveCount = importable.filter((r) => r.row.status === "published" && !isFuture(r.row.published_at)).length;
  const scheduledCount = importable.filter((r) => r.row.status === "published" && isFuture(r.row.published_at)).length;
  const draftCount = importable.length - liveCount - scheduledCount;
  const canImport = Boolean(header?.hasTitle) && importable.length > 0 && !busy;

  /* ---------------- step 1 ---------------- */

  function handleTemplate() {
    XLSX.writeFile(buildTemplateWorkbook(categories), "crochet-import-template.xlsx");
    setTemplateDownloaded(true);
  }

  /* ---------------- step 2: the spreadsheet ---------------- */

  function clearSheetState() {
    setSheetRows([]);
    setHeader(null);
    setSheetNames([]);
    setOverrides({});
    setResults(null);
    setParseError(null);
    setUploadFailures(null);
    workbookRef.current = null;
  }

  function loadSheet(wb: XLSX.WorkBook, sheetName: string) {
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      setParseError(`The sheet "${sheetName}" is empty.`);
      return;
    }
    const { rows: parsed, header: info } = parseSheet(sheet, sheetName, categories);
    if (parsed.length === 0) {
      setSheetRows([]);
      setHeader(info);
      setParseError(`The sheet "${sheetName}" has a header row but no posts under it.`);
      return;
    }
    if (parsed.length > MAX_ROWS) {
      setSheetRows([]);
      setHeader(null);
      setParseError(`This file has more than ${MAX_ROWS} rows. Please import at most ${MAX_ROWS} posts at a time.`);
      return;
    }
    setParseError(null);
    setHeader(info);
    setSheetRows(parsed);
    setOverrides({});
  }

  async function handleExcelChange(e: React.ChangeEvent<HTMLInputElement>) {
    clearSheetState();
    setExcelName("");

    const file = e.target.files?.[0];
    if (!file) return;
    setExcelName(file.name);

    if (file.size > MAX_EXCEL_BYTES) {
      setParseError("This Excel file is larger than 5 MB. Please check it only contains your post rows.");
      return;
    }

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true, sheetRows: MAX_ROWS + 2 });
      workbookRef.current = wb;
      setSheetNames(wb.SheetNames);

      const posts = wb.SheetNames.find((name) => name.trim().toLowerCase() === "posts") ?? wb.SheetNames[0];
      if (!posts) {
        setParseError("This file has no sheets.");
        return;
      }
      loadSheet(wb, posts);
      try {
        setExistingSlugs(await getExistingSlugs());
      } catch {
        setExistingSlugs([]);
      }
    } catch (err) {
      clearSheetState();
      setParseError(`Could not read this file: ${message(err)}`);
    }
  }

  /* ---------------- step 2: the photos ---------------- */

  async function handlePhotosChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    if (photosInputRef.current) photosInputRef.current.value = "";
    if (picked.length === 0) return;

    setResults(null);
    setUploadFailures(null);

    const refused: { name: string; reason: string }[] = [];
    const accepted: File[] = [];
    for (const file of picked) {
      try {
        assertUploadable(file);
        accepted.push(file);
      } catch (err) {
        refused.push({ name: file.name, reason: message(err) });
      }
    }
    setRejected(refused);

    const keyOf = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;
    const existing = new Set(photos.map((p) => keyOf(p.file)));
    const fresh: SelectedPhoto[] = [];
    for (const file of accepted) {
      if (existing.has(keyOf(file))) continue;
      existing.add(keyOf(file));
      fresh.push({
        id: photoIdRef.current++,
        file,
        name: file.name,
        lower: file.name.toLowerCase(),
        relPath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
        previewUrl: URL.createObjectURL(file),
      });
    }
    if (fresh.length === 0) return;

    const merged = [...photos, ...fresh].sort((a, b) => a.lower.localeCompare(b.lower, undefined, { numeric: true }));
    setPhotos(merged);

    const sizes = await Promise.all(fresh.map((p) => readImageSize(p.file)));
    setPhotos((prev) =>
      prev.map((p) => {
        const at = fresh.findIndex((f) => f.id === p.id);
        return at >= 0 && sizes[at] ? { ...p, w: sizes[at]!.w, h: sizes[at]!.h } : p;
      })
    );
  }

  function removePhoto(id: number) {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
    setUploadFailures(null);
  }

  function clearPhotos() {
    photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    setPhotos([]);
    setRejected([]);
    setUploadFailures(null);
    if (photosInputRef.current) photosInputRef.current.value = "";
  }

  /* ---------------- step 3: per-row overrides ---------------- */

  function setOverride(index: number, patch: Override) {
    setOverrides((prev) => ({ ...prev, [index]: { ...prev[index], ...patch } }));
  }

  /* ---------------- step 3: the import ---------------- */

  async function runImport(ignoreFailedPhotos: boolean) {
    const toImport = rows.filter((r) => r.include);
    if (toImport.length === 0) return;

    setBusy(true);
    cancelRef.current = false;
    setUploadFailures(null);
    setResults(null);

    try {
      /* ---- phase 1: upload the photos ---- */
      const queue: { photo: SelectedPhoto; slug: string }[] = [];
      const queued = new Set<number>();
      for (const row of toImport) {
        for (const photo of [...(row.coverFile ? [row.coverFile] : []), ...row.bodyPhotos]) {
          if (queued.has(photo.id) || uploadedRef.current.has(photo.id)) continue;
          if (ignoreFailedPhotos && failedPhotoRef.current.has(photo.id)) continue;
          queued.add(photo.id);
          queue.push({ photo, slug: row.finalSlug || row.slug });
        }
      }
      if (!ignoreFailedPhotos) failedPhotoRef.current.clear();

      let done = 0;
      if (queue.length > 0) {
        setProgress({ label: `Uploading photos… 0/${queue.length}`, done: 0, total: queue.length });
        await runWithLimit(queue, UPLOAD_CONCURRENCY, async ({ photo, slug }) => {
          try {
            const url = await uploadImage(photo.file, { slug });
            uploadedRef.current.set(photo.id, url);
            done += 1;
            setProgress({ label: `Uploading photos… ${done}/${queue.length}`, done, total: queue.length });
          } catch (err) {
            failedPhotoRef.current.set(photo.id, message(err));
          }
        });
      }

      const failures: UploadFailure[] = [];
      for (const row of toImport) {
        for (const photo of [...(row.coverFile ? [row.coverFile] : []), ...row.bodyPhotos]) {
          const reason = failedPhotoRef.current.get(photo.id);
          if (reason) failures.push({ sheetRow: row.sheetRow, filename: photo.name, message: reason });
        }
      }
      if (failures.length > 0 && !ignoreFailedPhotos) {
        setUploadFailures(failures);
        setProgress(null);
        setBusy(false);
        return;
      }
      const rowsWithoutPhotos = new Set(failures.map((f) => f.sheetRow));

      /* ---- phase 2: save the posts, in small batches ---- */
      const finalRows: ImportRow[] = [];
      const usedUrlsByRow: Record<number, string[]> = {};

      for (const row of toImport) {
        const bodyPhotos = row.bodyPhotos
          .map((photo, i) => ({ url: uploadedRef.current.get(photo.id), alt: row.bodyAlts[i] ?? "" }))
          .filter((item): item is { url: string; alt: string } => Boolean(item.url));
        const { content } = applyPhotoTokens(row.row.content ?? "", bodyPhotos);
        const coverUrl =
          row.coverUrlFromCell ?? (row.coverFile ? uploadedRef.current.get(row.coverFile.id) ?? null : null);

        usedUrlsByRow[row.sheetRow] = [...(coverUrl && !row.coverUrlFromCell ? [coverUrl] : []), ...bodyPhotos.map((p) => p.url)];
        finalRows.push({ ...row.row, content, cover_url: coverUrl, row_number: row.sheetRow });
      }

      const skipped: ImportResult[] = rows
        .filter((r) => !r.include)
        .map((r) => ({
          title: r.row.title || "(untitled row)",
          ok: false,
          kind: "skipped" as const,
          rowNumber: r.sheetRow,
          slug: r.slug || undefined,
          error: r.isExample
            ? "Skipped: the example row from the template."
            : r.warnings.find((w) => w.level === "blocked")?.text ?? "Skipped: you unchecked this row.",
        }));

      const saved: ImportResult[] = [];
      for (let i = 0; i < finalRows.length; i += SAVE_CHUNK) {
        if (cancelRef.current) break;
        const chunk = finalRows.slice(i, i + SAVE_CHUNK);
        setProgress({ label: `Saving posts… ${i}/${finalRows.length}`, done: i, total: finalRows.length });
        try {
          const { results: chunkResults } = await importPosts(chunk, { onDuplicate });
          saved.push(...chunkResults);
        } catch (err) {
          saved.push(
            ...chunk.map((c) => ({
              title: c.title,
              ok: false,
              kind: "failed" as const,
              error: message(err),
              rowNumber: c.row_number,
            }))
          );
        }
        setResults([...skipped, ...saved].sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0)));
      }

      const stopped = cancelRef.current ? finalRows.slice(saved.length).map((c) => ({
        title: c.title,
        ok: false,
        kind: "skipped" as const,
        error: "Stopped before this row was saved.",
        rowNumber: c.row_number,
      })) : [];

      const all = [...skipped, ...saved, ...stopped]
        .map((r) =>
          r.ok && r.rowNumber && rowsWithoutPhotos.has(r.rowNumber) ? { ...r, withoutCover: true } : r
        )
        .sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0));

      const orphanMap: Record<number, string[]> = {};
      for (const r of all) {
        if (!r.ok && r.kind === "failed" && r.rowNumber && usedUrlsByRow[r.rowNumber]?.length) {
          orphanMap[r.rowNumber] = usedUrlsByRow[r.rowNumber].map(storagePath);
        }
      }

      const problemRowNumbers = new Set(all.filter((r) => !r.ok).map((r) => r.rowNumber));
      setRetryCells(rows.filter((r) => problemRowNumbers.has(r.sheetRow) && !r.isExample).map((r) => r.cells));
      setOrphans(orphanMap);
      setResults(all);
      resetAfterImport();
    } catch (err) {
      setResults([{ title: "Import", ok: false, kind: "failed", error: message(err) }]);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  /** Clears the inputs so a second click cannot re-upload and re-create everything. */
  function resetAfterImport() {
    clearPhotos();
    setSheetRows([]);
    setHeader(null);
    setSheetNames([]);
    setOverrides({});
    setUploadFailures(null);
    uploadedRef.current.clear();
    failedPhotoRef.current.clear();
    workbookRef.current = null;
    if (excelInputRef.current) excelInputRef.current.value = "";
  }

  function startOver() {
    resetAfterImport();
    setResults(null);
    setOrphans({});
    setRetryCells([]);
    setExcelName("");
    setParseError(null);
    setFailuresOnly(false);
  }

  /* ---------------- render ---------------- */

  const createdCount = results?.filter((r) => r.kind === "created").length ?? 0;
  const failedCount = results?.filter((r) => r.kind === "failed").length ?? 0;
  const resultSkipped = results?.filter((r) => r.kind === "skipped").length ?? 0;

  return (
    <div className="steps">
      <section className="panel" data-state={templateDownloaded ? "done" : "todo"}>
        <h2>Download the template</h2>
        <p className="panel-note">
          Start from this Excel file: it has one column for every field of the post form, one example row, a sheet
          explaining each column and a sheet with the values you can copy.
        </p>
        <button type="button" className="btn" onClick={handleTemplate} disabled={busy}>
          Download template (.xlsx)
        </button>
      </section>

      <section className="panel" data-state={sheetRows.length > 0 ? "done" : "active"}>
        <h2>Add your Excel file and photos</h2>
        <div className="field">
          <label htmlFor="excel-file">Excel file (.xlsx)</label>
          <input
            id="excel-file"
            ref={excelInputRef}
            type="file"
            accept=".xlsx,.xls"
            disabled={busy}
            onChange={handleExcelChange}
          />
          <p className="hint">At most {MAX_ROWS} posts and 5 MB per file. The sheet must be named “Posts”.</p>
        </div>

        {sheetNames.length > 1 && (
          <div className="field">
            <label htmlFor="sheet-pick">Sheet to read</label>
            <select
              id="sheet-pick"
              value={header?.sheetName ?? ""}
              disabled={busy}
              onChange={(e) => workbookRef.current && loadSheet(workbookRef.current, e.target.value)}
            >
              {sheetNames.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <p className="hint">This file has {sheetNames.length} sheets. Reading “{header?.sheetName}”.</p>
          </div>
        )}

        <div className="field">
          <label htmlFor="image-files">Photos</label>
          <input
            id="image-files"
            ref={photosInputRef}
            type="file"
            accept={ACCEPT_ATTR}
            multiple
            disabled={busy}
            onChange={handlePhotosChange}
          />
          <p className="hint">
            You can pick one folder at a time — new photos are added to the ones already chosen. Name them{" "}
            <code>your-slug-cover.jpg</code>, <code>your-slug-1.jpg</code>, <code>your-slug-2.jpg</code>. Photos are
            uploaded before the posts are saved.
          </p>
        </div>

        {photos.length > 0 && (
          <>
            <div className="button-row">
              <p className="hint">{photos.length} photo(s) ready.</p>
              <button type="button" className="btn btn-small btn-danger" onClick={clearPhotos} disabled={busy}>
                Clear all
              </button>
            </div>
            <ul className="chip-list">
              {photos.map((photo) => (
                <li key={photo.id}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="thumb" src={photo.previewUrl} alt="" />
                  <span>{photo.name}</span>
                  <button type="button" className="remove" onClick={() => removePhoto(photo.id)} disabled={busy}>
                    Remove {photo.name}
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}

        {rejected.length > 0 && (
          <div className="notice notice-error">
            <p>These files were not added:</p>
            <ul className="warn-list">
              {rejected.map((item) => (
                <li key={item.name} data-level="blocked">
                  <strong>{item.name}</strong> — {item.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {parseError && (
          <p className="notice notice-error" role="alert">
            {parseError}
          </p>
        )}
      </section>

      {sheetRows.length > 0 && (
        <section className="panel" data-state="active">
          <h2>Check the preview</h2>
          <p className="panel-note">
            Nothing is saved or uploaded yet. {excelName && <strong>{excelName}</strong>}
            {header?.sheetName ? ` — sheet “${header.sheetName}”` : ""}
          </p>

          {header && (
            <div className={`notice ${header.hasTitle ? "notice-ok" : "notice-error"}`}>
              <p>
                Columns found: {header.found.length} of {HEADER_KEYS.length}.
              </p>
              {!header.hasTitle && (
                <p>
                  Your sheet has no “title” column. Download the template and copy your data into it. The expected
                  column names are: {HEADER_KEYS.join(", ")}.
                </p>
              )}
              {header.unknown.length > 0 && (
                <p>These columns were not recognised and will be ignored: {header.unknown.join(", ")}.</p>
              )}
              {header.missing.length > 0 && (
                <p>These template columns are missing and will be left empty: {header.missing.join(", ")}.</p>
              )}
            </div>
          )}

          <p className="panel-note">
            {readyCount} ready, {warnCount} with warnings, {skippedCount} skipped — {liveCount} will go LIVE
            immediately, {scheduledCount} are scheduled for later and {draftCount} will be saved as drafts.
          </p>

          <ul className="import-list">
            {rows.map((row) => {
              const hasBlocked = row.warnings.some((w) => w.level === "blocked");
              return (
                <li className="import-row" key={row.index} data-blocked={hasBlocked}>
                  <div className="meta">
                    <h3>{row.row.title || "(no title)"}</h3>
                    <label>
                      <input
                        type="checkbox"
                        checked={row.include}
                        disabled={busy || hasBlocked || row.isExample}
                        onChange={(e) => setOverride(row.index, { excluded: !e.target.checked })}
                      />{" "}
                      Import this row
                    </label>
                    <span className="chip">Row {row.sheetRow}</span>
                    <span className="chip">{row.row.category}</span>
                    <span className="chip">
                      {row.row.status === "published"
                        ? isFuture(row.row.published_at)
                          ? `Scheduled ${row.row.published_at?.slice(0, 10)}`
                          : "Live now"
                        : "Draft"}
                    </span>
                    <span className="slug">/blog/{row.finalSlug || "—"}</span>
                    <span className="chip">{row.bodyPhotos.length} photos in the article</span>
                    <span className="chip">{row.row.materials?.length ?? 0} materials</span>
                    <span className="chip">{row.row.faq?.length ?? 0} FAQ</span>
                    <span className="chip">{(row.row.content ?? "").length} characters</span>
                  </div>

                  <div className="field">
                    <label htmlFor={`cover-${row.index}`}>Cover photo{row.coverGuessed ? " (guessed — please check)" : ""}</label>
                    <div className="button-row">
                      {row.coverFile ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={row.coverFile.previewUrl} alt="" />
                      ) : row.coverUrlFromCell ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="thumb" src={row.coverUrlFromCell} alt="" />
                      ) : null}
                      <select
                        id={`cover-${row.index}`}
                        value={row.coverFile ? String(row.coverFile.id) : ""}
                        disabled={busy || photos.length === 0}
                        onChange={(e) =>
                          setOverride(row.index, { coverId: e.target.value ? Number(e.target.value) : null })
                        }
                      >
                        <option value="">— no cover photo —</option>
                        {photos.map((photo) => (
                          <option key={photo.id} value={photo.id}>
                            {photo.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(row.coverFile || row.bodyPhotos.length > 0) && (
                    <ul className="photo-grid">
                      {row.coverFile && (
                        <li className="photo-tile" data-role="cover">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={row.coverFile.previewUrl} alt="" />
                          <span className="order">Cover</span>
                          <button
                            type="button"
                            className="remove"
                            disabled={busy}
                            onClick={() => setOverride(row.index, { coverId: null })}
                          >
                            Remove the cover photo
                          </button>
                        </li>
                      )}
                      {row.bodyPhotos.map((photo, i) => (
                        <li className="photo-tile" data-role="body" key={photo.id}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photo.previewUrl} alt="" />
                          <span className="order">{i + 1}</span>
                          <button
                            type="button"
                            className="remove"
                            disabled={busy}
                            onClick={() =>
                              setOverride(row.index, { dropped: [...(overrides[row.index]?.dropped ?? []), photo.id] })
                            }
                          >
                            Remove {photo.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {row.warnings.length === 0 ? (
                    <p className="warn-ok">Ready</p>
                  ) : (
                    <ul className="warn-list">
                      {row.warnings.map((warning, i) => (
                        <li key={i} data-level={warning.level}>
                          {warning.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>

          {unusedPhotos.length > 0 && (
            <p className="panel-note">
              Not used by any row: {unusedPhotos.map((p) => p.name).join(", ")}. Rename them{" "}
              <code>your-slug-1.jpg</code> or pick them in a row above.
            </p>
          )}

          <fieldset className="field">
            <legend>If a post with the same web address already exists</legend>
            <label>
              <input
                type="radio"
                name="on-duplicate"
                value="skip"
                checked={onDuplicate === "skip"}
                disabled={busy}
                onChange={() => setOnDuplicate("skip")}
              />{" "}
              Skip those rows (recommended — nothing is duplicated)
            </label>
            <label>
              <input
                type="radio"
                name="on-duplicate"
                value="suffix"
                checked={onDuplicate === "suffix"}
                disabled={busy}
                onChange={() => setOnDuplicate("suffix")}
              />{" "}
              Create them anyway, with -2 at the end of the web address
            </label>
          </fieldset>

          {uploadFailures && (
            <div className="notice notice-error">
              <p>{uploadFailures.length} photo(s) could not be uploaded, so nothing was saved yet.</p>
              <ul className="warn-list">
                {uploadFailures.map((failure, i) => (
                  <li key={i} data-level="blocked">
                    Row {failure.sheetRow} — <strong>{failure.filename}</strong>: {failure.message}
                  </li>
                ))}
              </ul>
              <div className="button-row">
                <button type="button" className="btn" onClick={() => setUploadFailures(null)}>
                  Fix and try again
                </button>
                <button type="button" className="btn btn-small" onClick={() => runImport(true)}>
                  Import anyway without those photos
                </button>
              </div>
            </div>
          )}

          <div className="button-row">
            <button type="button" className="btn btn-primary" onClick={() => runImport(false)} disabled={!canImport}>
              {busy ? "Importing…" : `Import ${importable.length} post(s)`}
            </button>
            {busy && (
              <button type="button" className="btn btn-small" onClick={() => (cancelRef.current = true)}>
                Cancel
              </button>
            )}
          </div>

          <div aria-live="polite">
            {progress && (
              <p className="panel-note">
                <progress value={progress.done} max={progress.total} /> {progress.label}
              </p>
            )}
          </div>
        </section>
      )}

      {results && (
        <section className="panel" data-state="done">
          <h2>Result</h2>
          <p className={`notice ${failedCount > 0 ? "notice-error" : "notice-ok"}`} role="status">
            {createdCount} created, {failedCount} failed, {resultSkipped} skipped.
          </p>

          <div className="result-summary">
            <button type="button" className="btn btn-small" onClick={() => setFailuresOnly((v) => !v)}>
              {failuresOnly ? "Show every row" : "Show failures only"}
            </button>
            {retryCells.length > 0 && (
              <button
                type="button"
                className="btn btn-small"
                onClick={() => downloadRowsWorkbook(retryCells, "crochet-import-failed-rows.xlsx")}
              >
                Download the failed rows as Excel
              </button>
            )}
          </div>

          <ul className="result-list" data-filter={failuresOnly ? "failures" : "all"}>
            {results
              .filter((r) => !failuresOnly || !r.ok)
              .map((r, i) => (
                <li key={i} data-ok={r.ok} data-kind={r.kind}>
                  {r.rowNumber && <span className="chip">Row {r.rowNumber}</span>}{" "}
                  {r.id ? <Link href={`/admin/posts/${r.id}`}>{r.title}</Link> : <strong>{r.title}</strong>}{" "}
                  {r.slug && <span className="slug">/blog/{r.slug}</span>}{" "}
                  {r.ok ? (
                    <>
                      {r.withoutCover ? "Created WITHOUT its photos" : "Created"}
                      {r.slug && (
                        <>
                          {" "}
                          <a href={`/blog/${r.slug}`} target="_blank" rel="noopener">
                            /blog/{r.slug} ↗
                          </a>
                        </>
                      )}
                    </>
                  ) : (
                    r.error
                  )}
                  {r.rowNumber && orphans[r.rowNumber] && (
                    <span className="slug">
                      Photos already uploaded (they can be reused or deleted in Supabase Storage):{" "}
                      {orphans[r.rowNumber].join(", ")}
                    </span>
                  )}
                </li>
              ))}
          </ul>

          <div className="button-row">
            <button type="button" className="btn" onClick={startOver}>
              Import another file
            </button>
            <Link className="btn btn-primary" href="/admin/posts?status=draft">
              Go to Posts
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

function isFuture(iso: string | null | undefined) {
  if (!iso) return false;
  const time = new Date(iso).getTime();
  return !Number.isNaN(time) && time > Date.now();
}
