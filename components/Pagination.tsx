import Link from "next/link";

/**
 * Listing pagination. Plain links, so it costs no JavaScript, works without it
 * and gives Google a crawlable path to every pattern.
 *
 * Pages live on a path ("/category/amigurumi/page/2") rather than a query
 * string, which keeps every listing statically generated. Page 1 is always the
 * bare URL, so the canonical link never gains a redundant suffix.
 */
export default function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}) {
  if (totalPages <= 1) return null;

  const href = (n: number) => (n === 1 ? basePath : `${basePath}/page/${n}`);

  // Always show the first and last page, plus the current one and its neighbours.
  const shown = new Set([1, totalPages, page - 1, page, page + 1]);
  const numbers = Array.from(shown)
    .filter((n) => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b);

  return (
    <nav className="pagination" aria-label="Pages">
      {page > 1 ? (
        <Link className="page-step" href={href(page - 1)} rel="prev">
          <span aria-hidden="true">←</span> Previous
        </Link>
      ) : (
        <span className="page-step is-off" aria-hidden="true">
          <span aria-hidden="true">←</span> Previous
        </span>
      )}

      <ol className="page-numbers">
        {numbers.map((n, i) => (
          <li key={n}>
            {/* A jump of more than one page becomes an ellipsis. */}
            {i > 0 && n - numbers[i - 1] > 1 && <span className="page-gap">…</span>}
            {n === page ? (
              <span className="page-num is-current" aria-current="page">
                {n}
              </span>
            ) : (
              <Link className="page-num" href={href(n)} aria-label={`Page ${n}`}>
                {n}
              </Link>
            )}
          </li>
        ))}
      </ol>

      {page < totalPages ? (
        <Link className="page-step" href={href(page + 1)} rel="next">
          Next <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span className="page-step is-off" aria-hidden="true">
          Next <span aria-hidden="true">→</span>
        </span>
      )}
    </nav>
  );
}
