import type { Metadata } from "next";
import { cache } from "react";
import { BARE_HOST, WWW_HOST } from "./domain";
import { getPublicClient } from "./supabase/public";

/**
 * The production URL cannot usefully change at runtime (it's baked into
 * metadataBase, canonical links, etc. during the build), so it stays an
 * env var rather than a DB setting.
 */
function resolveSiteUrl() {
  // Vercel sets VERCEL_PROJECT_PRODUCTION_URL on every deployment, so canonical links
  // and the sitemap stay correct even when NEXT_PUBLIC_SITE_URL was never added to the project.
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000"));
  // Vercel names the *shortest* production domain, which became the bare one once it
  // was connected for ads.txt. Pages there redirect to www, so every canonical link and
  // sitemap entry was pointing Google at a redirect instead of at the page itself.
  if (url.hostname === BARE_HOST) url.hostname = WWW_HOST;
  return url.origin;
}

export const SITE_URL = resolveSiteUrl();
export const SITE_LOCALE = "en_US";

export type SiteSettings = {
  name: string;
  author: string;
  email: string;
  bio: string;
  etsy: string;
  pinterest: string;
  description: string;
  adsenseClient: string;
  adsenseSlotInArticle: string;
  adsenseSlotDisplay: string;
  adsEnabled: boolean;
};

const envDefaults: SiteSettings = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "My Crochet Blog",
  author: process.env.NEXT_PUBLIC_AUTHOR_NAME || "The Designer",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com",
  bio: "",
  etsy: process.env.NEXT_PUBLIC_ETSY_SHOP_URL || "https://www.etsy.com",
  pinterest: process.env.NEXT_PUBLIC_PINTEREST_URL || "https://www.pinterest.com",
  description:
    "Free crochet patterns with clear US-term instructions: amigurumi, wearables, home decor and beginner tutorials.",
  adsenseClient: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "",
  adsenseSlotInArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE || "",
  adsenseSlotDisplay: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DISPLAY || "",
  adsEnabled: true,
};

/** Site-wide settings, editable from /admin/settings. Cached per-request. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = getPublicClient();
  if (!supabase) return envDefaults;

  const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return envDefaults;

  return {
    name: data.site_name || envDefaults.name,
    author: data.author_name || envDefaults.author,
    email: data.contact_email || envDefaults.email,
    bio: data.author_bio || envDefaults.bio,
    etsy: data.etsy_url || envDefaults.etsy,
    pinterest: data.pinterest_url || envDefaults.pinterest,
    description: data.description || envDefaults.description,
    adsenseClient: data.adsense_client || "",
    adsenseSlotInArticle: data.adsense_slot_in_article || "",
    adsenseSlotDisplay: data.adsense_slot_display || "",
    adsEnabled: data.ads_enabled ?? true,
  };
});

type OpenGraph = NonNullable<Metadata["openGraph"]>;

/**
 * Open Graph tags: what Facebook, Pinterest and messaging apps show when a link
 * is shared. Next does not merge a page's `openGraph` with the layout's, it
 * replaces it, so every page that set its own og:url was silently losing the
 * site name, the locale and the picture (the home page was shared with no image
 * at all). Every `openGraph` therefore goes through here; a post passes its
 * cover photo in `images`, which replaces the default picture.
 */
export async function siteOpenGraph(fields: OpenGraph = {}): Promise<OpenGraph> {
  const site = await getSiteSettings();
  return {
    type: "website",
    siteName: site.name,
    locale: SITE_LOCALE,
    // Drawn by app/opengraph-image.tsx.
    images: [{ url: "/opengraph-image", width: 1200, height: 630, type: "image/png", alt: "Free crochet patterns" }],
    ...fields,
  };
}

/** Builds an absolute URL from a path, e.g. absoluteUrl("/blog/x"). */
export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Revalidation time for public pages (ISR): 5 minutes. */
export const REVALIDATE_SECONDS = 300;
