import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getCategories } from "@/lib/categories";
import { getSiteSettings } from "@/lib/site";

/** Custom 404 page (shown for any unknown URL). */
export default async function NotFound() {
  const [site, categories] = await Promise.all([getSiteSettings(), getCategories()]);
  return (
    <>
      <Header siteName={site.name} categories={categories} pinterest={site.pinterest} />
      <main id="main" className="wrap">
        <div className="not-found read">
          <p className="big">404</p>
          <h1>Oops, we dropped a stitch.</h1>
          <p className="muted">This page doesn’t exist, or it has moved. Let’s get you back on track.</p>
          <form className="search-form" action="/search" role="search" style={{ margin: "1.5rem auto" }}>
            <label htmlFor="nf-q" className="visually-hidden">
              Search patterns
            </label>
            <input id="nf-q" name="q" type="search" placeholder="Search patterns" />
            <button className="btn btn-primary" type="submit">
              Search
            </button>
          </form>
          <Link className="btn" href="/">
            Back to the homepage
          </Link>
        </div>
      </main>
      <Footer site={site} categories={categories} />
    </>
  );
}
