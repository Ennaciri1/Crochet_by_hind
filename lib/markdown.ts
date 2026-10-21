import { Marked, type Tokens, type TokensList } from "marked";
import {
  ARTICLE_IMAGE_SIZES,
  buildSrcSet,
  fallbackWidth,
  isOptimizable,
  optimizedUrl,
  parseImageMeta,
} from "./images";

/**
 * Markdown → HTML for articles.
 * - "## Heading" gets an id so the table of contents can link to it.
 * - Images go through the Next image optimizer (AVIF/WebP + srcset) and are
 *   lazy-loaded, so a step photo costs ~20 KB on a phone instead of 3 MB.
 * - Scripts, inline event handlers and javascript: links are removed.
 */

export type TocItem = { id: string; text: string };

/** "Why you'll love it!" → "why-youll-love-it" */
export function slugify(text: string) {
  return text
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

function escapeAttr(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Removes anything that could run JavaScript from an HTML string. */
export function stripScripts(html: string) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<\/?(script|iframe|object|embed|form|base|meta|link|style)\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/(href|src|xlink:href|action|formaction)\s*=\s*(["']?)\s*(javascript|vbscript|data:text\/html)[^"'\s>]*/gi, '$1=$2#');
}

function createMarked() {
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      heading(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Heading) {
        const text = this.parser.parseInline(token.tokens);
        const level = Math.min(Math.max(token.depth, 2), 6); // the post title is the only <h1>
        const id = level === 2 ? ` id="${slugify(token.text)}"` : "";
        return `<h${level}${id}>${text}</h${level}>\n`;
      },
      image(token: Tokens.Image) {
        const { src, width, height } = parseImageMeta(token.href);
        const alt = escapeAttr(token.text);
        const caption = token.title
          ? `<figcaption>${escapeAttr(token.title)}</figcaption>`
          : "";

        // An image the optimizer cannot serve (SVG, foreign host) is left alone
        // rather than turned into a request that would 400.
        if (!isOptimizable(src)) {
          return `<figure class="figure"><img src="${escapeAttr(src)}" alt="${alt}" loading="lazy" decoding="async" />${caption}</figure>`;
        }

        // width/height let the browser reserve the right box before the photo
        // arrives, which is what keeps CLS at 0. They are only known for photos
        // uploaded since the size hint was added (see lib/images.ts).
        const dimensions = width && height ? ` width="${width}" height="${height}"` : "";
        const display = optimizedUrl(src, fallbackWidth(width));

        // The <button> makes "view larger" reachable by keyboard and announced
        // by screen readers without any JavaScript in the markup itself.
        return (
          `<figure class="figure">` +
          `<button type="button" class="zoom-btn" aria-label="View larger photo">` +
          `<img src="${escapeAttr(display)}"` +
          ` srcset="${escapeAttr(buildSrcSet(src, width))}"` +
          ` sizes="${ARTICLE_IMAGE_SIZES}"` +
          ` alt="${alt}"${dimensions}` +
          ` loading="lazy" decoding="async"` +
          ` data-zoom="${escapeAttr(optimizedUrl(src, 1200))}" />` +
          `</button>${caption}</figure>`
        );
      },

      /**
       * A <figure> is not allowed inside a <p>, and the browser would hoist it
       * out and leave an empty paragraph behind. A paragraph that holds nothing
       * but photos therefore skips the <p> wrapper.
       */
      paragraph(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Paragraph) {
        const inner = this.parser.parseInline(token.tokens);
        const onlyImages =
          token.tokens.length > 0 &&
          token.tokens.every(
            (t) => t.type === "image" || t.type === "space" || (t.type === "text" && !t.raw.trim()),
          );
        return onlyImages ? `${inner}\n` : `<p>${inner}</p>\n`;
      },
      link(this: { parser: { parseInline: (t: Tokens.Generic[]) => string } }, token: Tokens.Link) {
        const text = this.parser.parseInline(token.tokens);
        const external = /^https?:\/\//.test(token.href);
        const rel = external ? ' target="_blank" rel="noopener noreferrer"' : "";
        const title = token.title ? ` title="${escapeAttr(token.title)}"` : "";
        return `<a href="${escapeAttr(token.href)}"${title}${rel}>${text}</a>`;
      },
    },
  });
  return marked;
}

const marked = createMarked();

/** Simple conversion (pattern instructions, admin preview). */
export function renderMarkdown(markdown: string): string {
  return stripScripts(marked.parse(markdown ?? "", { async: false }) as string);
}

/** Table of contents from "## " headings. */
export function getToc(markdown: string): TocItem[] {
  const tokens = marked.lexer(markdown ?? "");
  return tokens
    .filter((t): t is Tokens.Heading => t.type === "heading" && (t as Tokens.Heading).depth === 2)
    .map((t) => ({ id: slugify(t.text), text: t.text.replace(/[*_`]/g, "") }));
}

/**
 * Renders the article in two halves so an in-article ad can be placed
 * between paragraphs, roughly in the middle.
 * If the article is short (fewer than 4 paragraphs), `second` is empty.
 */
export function renderArticleWithBreak(markdown: string): { first: string; second: string } {
  const tokens = marked.lexer(markdown ?? "");
  // Only paragraphs of prose count: splitting on a paragraph that holds a step
  // photo would push the ad between a photo and the text explaining it.
  const isTextParagraph = (token: Tokens.Generic) =>
    token.type === "paragraph" &&
    ((token as Tokens.Paragraph).tokens ?? []).some((t) => t.type !== "image" && t.type !== "space");
  const paragraphIndexes = tokens
    .map((t, i) => (isTextParagraph(t) ? i : -1))
    .filter((i) => i >= 0);

  if (paragraphIndexes.length < 4) {
    return { first: stripScripts(marked.parser(tokens)), second: "" };
  }

  // Split right AFTER the middle paragraph.
  const splitAt = paragraphIndexes[Math.floor(paragraphIndexes.length / 2) - 1] + 1;
  const firstTokens = Object.assign(tokens.slice(0, splitAt), { links: tokens.links }) as TokensList;
  const secondTokens = Object.assign(tokens.slice(splitAt), { links: tokens.links }) as TokensList;

  return {
    first: stripScripts(marked.parser(firstTokens)),
    second: stripScripts(marked.parser(secondTokens)),
  };
}

/** Plain text (for reading time and descriptions). */
export function markdownToText(markdown: string) {
  return (markdown ?? "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_`~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Reading time in minutes (about 220 words per minute). */
export function readingTime(...texts: string[]) {
  const words = texts.map(markdownToText).join(" ").split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
