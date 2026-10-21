import Image from "next/image";
import Link from "next/link";
import { getSiteSettings } from "@/lib/site";

/**
 * The short "about me" shown beside every pattern: logo, a friendly line or
 * two, and a link to the full About page. The text lives in /admin → Settings,
 * and leaving it empty hides the whole box.
 */
export default async function AuthorBio() {
  const site = await getSiteSettings();
  if (!site.bio.trim()) return null;

  return (
    <section className="author-bio" aria-labelledby="author-bio-title">
      <Image
        src="/logo.png"
        alt=""
        width={96}
        height={96}
        sizes="96px"
        className="author-bio-mark"
      />
      <p id="author-bio-title" className="author-bio-hi">
        Hi, I&rsquo;m <strong>{site.author}</strong>!
      </p>
      <p className="author-bio-text">{site.bio}</p>
      <Link className="author-bio-link" href="/about">
        More about me →
      </Link>
    </section>
  );
}
