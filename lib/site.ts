/**
 * Site-wide settings, read from environment variables (.env.local / Vercel).
 * Change them in your .env file, never in the code.
 */
export const site = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || "My Crochet Blog",
  author: process.env.NEXT_PUBLIC_AUTHOR_NAME || "The Designer",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com",
  etsy: process.env.NEXT_PUBLIC_ETSY_SHOP_URL || "https://www.etsy.com",
  pinterest: process.env.NEXT_PUBLIC_PINTEREST_URL || "https://www.pinterest.com",
  description:
    "Free crochet patterns with clear US-term instructions: amigurumi, wearables, home decor and beginner tutorials.",
  locale: "en_US",
};

/** AdSense settings. Everything is optional: no id = no ads. */
export const adsense = {
  client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "", // e.g. ca-pub-1234567890123456
  slotInArticle: process.env.NEXT_PUBLIC_ADSENSE_SLOT_IN_ARTICLE || "",
  slotDisplay: process.env.NEXT_PUBLIC_ADSENSE_SLOT_DISPLAY || "",
};

/** Builds an absolute URL from a path, e.g. absoluteUrl("/blog/x"). */
export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Revalidation time for public pages (ISR): 5 minutes. */
export const REVALIDATE_SECONDS = 300;
