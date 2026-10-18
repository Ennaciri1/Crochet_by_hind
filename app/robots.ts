import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** /robots.txt — keep the admin and the search results out of Google. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/search"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
