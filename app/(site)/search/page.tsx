import type { Metadata } from "next";
import { PostGrid } from "@/components/PostCard";
import { searchPosts } from "@/lib/posts";

// Search results depend on the query, so this page is rendered on each request.
export const metadata: Metadata = {
  title: "Search patterns",
  description: "Search free crochet patterns and tutorials.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

type Props = { searchParams: Promise<{ q?: string }> };

export default async function SearchPage({ searchParams }: Props) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? await searchPosts(query) : [];

  return (
    <div className="wrap">
      <header className="page-head">
        <h1>Search</h1>
        <form className="search-form" action="/search" role="search">
          <label htmlFor="q" className="visually-hidden">
            Search patterns
          </label>
          <input id="q" name="q" type="search" defaultValue={query} placeholder="Try “granny square” or “hat”" />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </form>
        {query && (
          <p aria-live="polite">
            {results.length} result{results.length === 1 ? "" : "s"} for “{query}”
          </p>
        )}
      </header>

      {query && results.length === 0 && (
        <p className="empty">Nothing found. Try a simpler word, like “blanket” or “amigurumi”.</p>
      )}
      {results.length > 0 && <PostGrid posts={results} />}
    </div>
  );
}
