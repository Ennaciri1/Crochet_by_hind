import Image from "next/image";
import Link from "next/link";
import { hasPinterestProfile, PinterestIcon } from "./PinterestFollow";
import type { Category } from "@/lib/categories";

export default function Header({
  siteName,
  categories,
  pinterest = "",
}: {
  siteName: string;
  categories: Category[];
  pinterest?: string;
}) {
  return (
    <header className="site-header">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="wrap">
        <Link href="/" className="logo">
          {/* alt="" on purpose: the site name next to it already says this. */}
          <Image src="/logo.png" alt="" width={48} height={48} className="logo-mark" priority />
          {siteName}
        </Link>
        <nav className="main-nav" aria-label="Main">
          <Link href="/blog">Blog</Link>
          {categories.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`}>
              {c.name}
            </Link>
          ))}
          <Link href="/search">Search</Link>
          {hasPinterestProfile(pinterest) && (
            <a className="nav-pinterest" href={pinterest} target="_blank" rel="noopener" aria-label="Follow on Pinterest">
              <PinterestIcon size={16} />
              <span>Follow</span>
            </a>
          )}
        </nav>
      </div>
    </header>
  );
}
