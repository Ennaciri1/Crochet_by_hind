import Link from "next/link";
import { categories } from "@/lib/categories";
import { site } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <h2>{site.name}</h2>
            <p>Free crochet patterns written in US terms, tested and photographed with love by {site.author}.</p>
          </div>
          <div>
            <h2>Patterns</h2>
            <ul>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/category/${c.slug}`}>{c.name}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Follow along</h2>
            <ul>
              <li>
                <a href={site.etsy} target="_blank" rel="noopener">
                  Etsy shop (ad-free PDFs)
                </a>
              </li>
              <li>
                <a href={site.pinterest} target="_blank" rel="noopener">
                  Pinterest
                </a>
              </li>
              <li>
                <Link href="/about">About</Link>
              </li>
              <li>
                <Link href="/contact">Contact</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>Legal</h2>
            <ul>
              <li>
                <Link href="/privacy-policy">Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms">Terms of Use</Link>
              </li>
              <li>
                <Link href="/disclaimer">Disclaimer</Link>
              </li>
            </ul>
          </div>
        </div>
        <p className="copyright">
          © {new Date().getFullYear()} {site.name}. All patterns and photos are the property of {site.author}.
        </p>
      </div>
    </footer>
  );
}
