import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/categories";

export default function Header({ siteName, categories }: { siteName: string; categories: Category[] }) {
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
          {categories.map((c) => (
            <Link key={c.slug} href={`/category/${c.slug}`}>
              {c.name}
            </Link>
          ))}
          <Link href="/search">Search</Link>
        </nav>
      </div>
    </header>
  );
}
