import type { NextConfig } from "next";
import { supabaseImageHost } from "./lib/images";

const nextConfig: NextConfig = {
  // The bulk importer posts batches of rows; a long pattern easily passes the 1 MB default.
  experimental: { serverActions: { bodySizeLimit: "8mb" } },
  images: {
    formats: ["image/avif", "image/webp"],
    // 75 for photos, 85 for cover images. Any other value is coerced by Next,
    // so keep this in step with lib/images.ts.
    qualities: [75, 85],
    // Post photos are immutable (the upload path carries a timestamp), so an
    // optimized copy can be cached for a year instead of being rebuilt.
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseImageHost(),
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  // The sitemap lives at /sitemap.xml only. These are the addresses people
  // commonly type into Search Console instead (or that WordPress uses); without
  // a redirect they hit the 404 page, and Google reports "the sitemap is an
  // HTML file". Google follows redirects when it fetches a sitemap.
  //
  // The bare domain (crochethenouda.com) sends visitors to www, except for
  // /ads.txt: AdSense checks that file on the domain you registered and kept
  // reporting "Not found" while it was behind a redirect, so it is answered
  // directly there. This only takes effect once the bare domain is set to serve
  // the site (not redirect) in Vercel → Settings → Domains.
  async redirects() {
    const toWww = ["/", "/:path((?!ads\\.txt$).+)"].map((source) => ({
      source,
      has: [{ type: "host" as const, value: "crochethenouda.com" }],
      destination: `https://www.crochethenouda.com${source === "/" ? "/" : "/:path"}`,
      permanent: true,
    }));
    const sitemaps = ["/sitemap", "/sitemap.html", "/sitemap_index.xml", "/sitemap-index.xml", "/wp-sitemap.xml"].map(
      (source) => ({ source, destination: "/sitemap.xml", permanent: true }),
    );
    return [...toWww, ...sitemaps];
  },
};

export default nextConfig;
