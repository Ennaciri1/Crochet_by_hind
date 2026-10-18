import Script from "next/script";
import { adsense } from "@/lib/site";

/**
 * Loads the Google AdSense library once.
 * Used only in the public layout (never in /admin), and only when
 * NEXT_PUBLIC_ADSENSE_CLIENT is set.
 */
export default function AdSenseScript() {
  if (!adsense.client) return null;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsense.client}`}
    />
  );
}
