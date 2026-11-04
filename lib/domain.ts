/**
 * The site's two addresses. Pages are served on www. The bare domain is
 * connected to Vercel only so AdSense can read /ads.txt on it; every other path
 * there redirects to www (next.config.ts). Canonical links, the sitemap and
 * structured data must therefore always say www.
 *
 * Free of imports on purpose, because next.config.ts imports it.
 */
export const WWW_HOST = "www.crochethenouda.com";
export const BARE_HOST = "crochethenouda.com";
