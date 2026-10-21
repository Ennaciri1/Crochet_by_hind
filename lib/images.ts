/**
 * Responsive images for Markdown bodies.
 *
 * Cover photos and cards use <Image> from next/image, which builds its own
 * srcset. Step-by-step photos inside a post are plain Markdown, so they used to
 * render as a bare <img> pointing at the Supabase original — a 3 MB PNG on a
 * phone. These helpers build the same /_next/image URLs next/image would, so
 * body photos get AVIF/WebP at the width the screen actually needs.
 *
 * Nothing here may import React, Next or a database: next.config.ts imports it.
 */

/**
 * Widths the optimizer is allowed to serve: Next's default `imageSizes` +
 * `deviceSizes`, trimmed to the range a reading column can ask for. A width
 * outside Next's lists is rejected with a 400, so this array may only contain
 * values from them.
 */
export const IMAGE_WIDTHS = [384, 640, 750, 828, 1080, 1200] as const;

/** Qualities allowed by next.config.ts. Anything else is coerced by Next. */
export const QUALITY_PHOTO = 75;
export const QUALITY_COVER = 85;

/**
 * The article column is 760px wide, so a phone needs the full viewport and a
 * desktop never needs more than 760 CSS px (times the device pixel ratio).
 */
export const ARTICLE_IMAGE_SIZES = "(max-width: 820px) 100vw, 760px";

/** Host of the Supabase Storage bucket — the one remote host next.config allows. */
export function supabaseImageHost(): string {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return "*.supabase.co";
  }
}

export type ImageMeta = {
  /** The URL with the size hint stripped off. */
  src: string;
  width?: number;
  height?: number;
};

/**
 * Reads the "#w=1086&h=1448" hint the admin appends when a photo is uploaded.
 * The fragment is never sent to a server, so adding it cannot break an existing
 * image; a photo uploaded before this convention simply has no hint.
 */
export function parseImageMeta(href: string): ImageMeta {
  const hash = href.indexOf("#");
  const src = hash >= 0 ? href.slice(0, hash) : href;
  const hint = hash >= 0 ? href.slice(hash + 1) : "";
  const read = (key: string) => {
    const value = Number(new RegExp(`(?:^|&)${key}=(\\d+)`).exec(hint)?.[1]);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  };
  return { src, width: read("w"), height: read("h") };
}

/** Appends the size hint used by parseImageMeta. */
export function withImageMeta(src: string, size: { w: number; h: number } | null) {
  return size ? `${src}#w=${size.w}&h=${size.h}` : src;
}

/**
 * True when /_next/image can handle this source. Everything else (SVG
 * illustrations, data: URIs, images hosted somewhere next.config does not
 * allow) is left exactly as the author wrote it rather than turned into a
 * broken optimizer request.
 */
export function isOptimizable(src: string): boolean {
  if (!src || src.startsWith("data:") || /\.svg($|\?)/i.test(src)) return false;
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    return url.hostname === supabaseImageHost() && url.pathname.includes("/storage/v1/object/public/");
  } catch {
    return false;
  }
}

export function optimizedUrl(src: string, width: number, quality = QUALITY_PHOTO) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/**
 * A srcset across IMAGE_WIDTHS. Widths past the photo's own width are dropped
 * when we know it (the optimizer will not upscale, so they would be duplicates),
 * keeping at least one entry.
 */
export function buildSrcSet(src: string, intrinsicWidth?: number, quality = QUALITY_PHOTO) {
  const widths = intrinsicWidth
    ? IMAGE_WIDTHS.filter((w) => w <= intrinsicWidth)
    : [...IMAGE_WIDTHS];
  const used = widths.length > 0 ? widths : [IMAGE_WIDTHS[0]];
  return used.map((w) => `${optimizedUrl(src, w, quality)} ${w}w`).join(", ");
}

/** The widest sensible single URL, used for the plain `src` fallback. */
export function fallbackWidth(intrinsicWidth?: number) {
  if (!intrinsicWidth) return 1080;
  const fits = IMAGE_WIDTHS.filter((w) => w <= intrinsicWidth);
  return fits.length > 0 ? fits[fits.length - 1] : IMAGE_WIDTHS[0];
}
