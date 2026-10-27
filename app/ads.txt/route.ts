import { getPublicClient } from "@/lib/supabase/public";

/**
 * /ads.txt — tells advertisers that Google is allowed to sell ads on this site.
 * Built from the AdSense client id set in /admin/settings ("ca-pub-123..." → "pub-123...").
 *
 * If the database cannot be reached while this file is being refreshed, it throws
 * instead of answering with an empty file: Next then keeps serving the last good
 * copy. An empty ads.txt, even for five minutes, makes AdSense report "Not found".
 */
export const revalidate = 300;

export async function GET() {
  const supabase = getPublicClient();
  let publisherId = "";

  if (supabase) {
    const { data, error } = await supabase
      .from("settings")
      .select("adsense_client")
      .eq("id", 1)
      .maybeSingle();
    if (error) throw new Error(`ads.txt: could not read settings (${error.message})`);
    publisherId = String(data?.adsense_client || "").replace(/^ca-/, "");
  }

  publisherId ||= (process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "").replace(/^ca-/, "");
  const body = publisherId
    ? `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`
    : "# Add your AdSense client id in /admin/settings to publish this file\n";

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
