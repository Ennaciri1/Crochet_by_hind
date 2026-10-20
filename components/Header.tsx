import Link from "next/link";
import YarnBall from "./YarnBall";
import type { Category } from "@/lib/categories";

export default function Header({ siteName, categories }: { siteName: string; categories: Category[] }) {
  return (
    <header className="site-header">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="wrap">
        <Link href="/" className="logo">
          <YarnBall className="logo-mark" color="var(--yarn-rose)" size={34} />
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
