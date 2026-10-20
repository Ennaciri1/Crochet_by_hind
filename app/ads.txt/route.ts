import { getSiteSettings } from "@/lib/site";

/**
 * /ads.txt — tells advertisers that Google is allowed to sell ads on this site.
 * Built from the AdSense client id set in /admin/settings ("ca-pub-123..." → "pub-123...").
 */
export const revalidate = 300;

export async function GET() {
  const { adsenseClient } = await getSiteSettings();
  const publisherId = adsenseClient.replace(/^ca-/, "");
  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# Add your AdSense client id in /admin/settings to publish this file\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
