import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/StaticPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Disclaimer",
  description: `Advertising, affiliate and safety disclaimer for ${site.name}.`,
  alternates: { canonical: "/disclaimer" },
};

export default function DisclaimerPage() {
  return (
    <StaticPage title="Disclaimer" path="/disclaimer" updated="October 18, 2026">
      <h2>Advertising</h2>
      <p>
        {site.name} is supported by advertising. Ads are served by Google AdSense and are clearly labelled
        “Advertisement”. We do not choose the individual ads you see, and showing an ad does not mean we endorse the
        product. Read our <Link href="/privacy-policy">Privacy Policy</Link> to learn how ad cookies work.
      </p>

      <h2>Our own products</h2>
      <p>
        Some links point to our own{" "}
        <a href={site.etsy} target="_blank" rel="noopener">
          Etsy shop
        </a>
        , where we sell ad-free PDF versions of our patterns. If a post ever contains an affiliate link, it will be
        mentioned in that post.
      </p>

      <h2>Safety: toys and items for babies</h2>
      <p>
        <strong>Plastic safety eyes, buttons, beads and other small parts are a choking hazard</strong> and are not
        safe for babies and children under 3 years old. For toys made for babies and young children, embroider the eyes
        and details with yarn instead, sew all parts on very securely, and check the toy regularly for wear.
      </p>
      <p>
        Never leave a baby unattended with a toy, and do not put crocheted toys, blankets or loose items in a sleeping
        infant’s crib. Items made from our patterns are made at your own risk, and you are responsible for the safety
        of anything you make, give or sell.
      </p>

      <h2>Accuracy</h2>
      <p>
        Patterns are tested, but errors can still happen, and your finished size may differ depending on yarn, hook and
        tension. If you find a mistake, please <Link href="/contact">tell us</Link> so we can fix it.
      </p>
    </StaticPage>
  );
}
