import type { Metadata } from "next";
import Link from "next/link";
import StaticPage from "@/components/StaticPage";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `Meet ${site.author}, the crochet designer behind ${site.name}.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <StaticPage title="About" path="/about" intro={`Hi, I’m ${site.author} — the hands behind ${site.name}.`}>
      <p>
        I design crochet patterns that are calm to make and lovely to use: soft amigurumi friends, warm wearables and
        simple pieces for the home. Every pattern on this site is written in <strong>US crochet terms</strong>,
        tested, and photographed step by step.
      </p>

      <h2>Why the patterns are free</h2>
      <p>
        I believe everyone should be able to learn to crochet. The patterns on this blog are free to read, and the site
        is supported by ads. If you would rather have a clean, printable copy without ads, you can buy the PDF version in
        my{" "}
        <a href={site.etsy} target="_blank" rel="noopener">
          Etsy shop
        </a>
        . Every purchase helps me publish more free patterns.
      </p>

      <h2>What you will find here</h2>
      <ul>
        <li>Free patterns with stitch counts for every round</li>
        <li>Beginner-friendly tutorials for stitches and techniques</li>
        <li>Printable pattern cards — no ads on paper</li>
      </ul>

      <h2>Say hello</h2>
      <p>
        I love seeing what you make! Share your finished projects on{" "}
        <a href={site.pinterest} target="_blank" rel="noopener">
          Pinterest
        </a>{" "}
        or send me a note through the <Link href="/contact">contact page</Link>.
      </p>
    </StaticPage>
  );
}
