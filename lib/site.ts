import { cache } from "react";
import { getPublicClient } from "./supabase/public";

/**
 * The production URL cannot usefully change at runtime (it's baked into
 * metadataBase, canonical links, etc. during the build), so it stays an
 * env var rather than a DB setting.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_LOCALE = "en_US";

export type SiteSettings = {
  name: string;
  author: string;
  email: string;
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
    etsy: data.etsy_url || envDefaults.etsy,
    pinterest: data.pinterest_url || envDefaults.pinterest,
    description: data.description || envDefaults.description,
    adsenseClient: data.adsense_client || "",
    adsenseSlotInArticle: data.adsense_slot_in_article || "",
    adsenseSlotDisplay: data.adsense_slot_display || "",
    adsEnabled: data.ads_enabled ?? true,
  };
});

/** Builds an absolute URL from a path, e.g. absoluteUrl("/blog/x"). */
export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Revalidation time for public pages (ISR): 5 minutes. */
export const REVALIDATE_SECONDS = 300;
