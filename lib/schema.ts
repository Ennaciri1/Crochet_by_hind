import { absoluteUrl, type SiteSettings } from "./site";

/**
 * Structured data (JSON-LD) shared by several pages.
 *
 * The Organization block tells Google who publishes the site: its name, logo
 * and official profiles (Etsy, Pinterest). It is what Google uses for the
 * publisher of every article and, in time, for a knowledge panel. Every page
 * that mentions the publisher embeds this same block with the same "@id", so
 * Google merges them into one entity.
 */
export function organizationSchema(site: SiteSettings) {
  const sameAs = [site.etsy, site.pinterest].filter(
    // Skip the placeholder links used before the owner fills in /admin/settings.
    (url) => url && !/^https:\/\/www\.(etsy|pinterest)\.com\/?$/.test(url),
  );
  return {
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: site.name,
    url: absoluteUrl("/"),
    logo: { "@type": "ImageObject", url: absoluteUrl("/logo.png"), width: 512, height: 512 },
    ...(site.email ? { email: site.email } : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/** The author of every post: links to the About page, which introduces her. */
export function authorSchema(site: SiteSettings) {
  return { "@type": "Person", name: site.author, url: absoluteUrl("/about") };
}

/**
 * "20 minutes" → "PT20M", "2 hours" → "PT2H", "1.5 hours" → "PT1H30M",
 * "2-3 hours" → "PT3H" (the upper bound). Google rejects free text in
 * timeRequired, so anything unreadable returns undefined and is left out.
 */
export function toIsoDuration(text: string): string | undefined {
  const m = /(\d+(?:[.,]\d+)?)\s*(h|hr|hrs|hours?|m|min|mins|minutes?)\b/i.exec(text ?? "");
  if (!m) return undefined;
  const value = Number(m[1].replace(",", "."));
  const minutes = Math.round(/^h/i.test(m[2]) ? value * 60 : value);
  if (!minutes) return undefined;
  const h = Math.floor(minutes / 60);
  const min = minutes % 60;
  return `PT${h ? `${h}H` : ""}${min ? `${min}M` : ""}`;
}
