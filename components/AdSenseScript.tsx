/**
 * Renders Google's async script in the initial HTML so crawlers can find it.
 * React hoists async scripts with a src into <head> and deduplicates them.
 * Used only in the public layout (never in /admin), and only when
 * ads are enabled and an AdSense client id is set (see /admin/settings).
 */
export default function AdSenseScript({ client }: { client: string }) {
  if (!client) return null;
  return (
    <script
      async
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`}
    />
  );
}
