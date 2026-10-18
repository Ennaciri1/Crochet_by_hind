import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/StaticPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `The rules for using ${site.name} and its free crochet patterns.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <StaticPage title="Terms of Use" path="/terms" updated="October 18, 2026">
      <p>By using {site.name}, you agree to these terms. If you do not agree, please do not use the site.</p>

      <h2>Copyright of patterns and photos</h2>
      <p>
        All patterns, text and photos on this site are © {site.author} and protected by copyright. The patterns are free
        to read and to use for your own crocheting.
      </p>
      <ul>
        <li>
          <strong>You may</strong> make items from the patterns for yourself, as gifts, for charity, or to sell in small
          quantities. Please credit {site.name} with a link when you sell or share them.
        </li>
        <li>
          <strong>You may not</strong> copy, translate, republish, share or sell the pattern text or photos, in whole or
          in part, online or in print. Sharing a link to the post is always welcome.
        </li>
      </ul>

      <h2>Pinterest and social media</h2>
      <p>
        You are welcome to pin our photos with the “Save to Pinterest” button, or share one photo with a link back to
        the original post.
      </p>

      <h2>Purchases</h2>
      <p>
        PDF patterns are sold through{" "}
        <a href={site.etsy} target="_blank" rel="noopener">
          Etsy
        </a>
        . Etsy’s terms and refund policies apply to those purchases.
      </p>

      <h2>No warranty</h2>
      <p>
        Patterns are tested carefully, but mistakes can happen and results depend on your yarn, hook and tension. The
        site is provided “as is”, without warranties of any kind. See our <Link href="/disclaimer">Disclaimer</Link>.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, {site.author} is not liable for any damage resulting from the use of this site
        or its patterns.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms at any time. Continued use of the site means you accept the latest version.
        Questions? <Link href="/contact">Contact us</Link>.
      </p>
    </StaticPage>
  );
}
