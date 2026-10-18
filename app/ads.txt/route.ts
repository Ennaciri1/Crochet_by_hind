/**
 * /ads.txt — tells advertisers that Google is allowed to sell ads on this site.
 * Built automatically from NEXT_PUBLIC_ADSENSE_CLIENT ("ca-pub-123..." → "pub-123...").
 */
export const dynamic = "force-static";

export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";
  const publisherId = client.replace(/^ca-/, "");
  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# Set NEXT_PUBLIC_ADSENSE_CLIENT to publish your ads.txt\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
