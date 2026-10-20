import Script from "next/script";

/**
 * Loads the Google AdSense library once.
 * Used only in the public layout (never in /admin), and only when
 * ads are enabled and an AdSense client id is set (see /admin/settings).
 */
export default function AdSenseScript({ client }: { client: string }) {
  if (!client) return null;
  return (
    <Script
      id="adsense"
      async
      strategy="afterInteractive"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
