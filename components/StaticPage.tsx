import Breadcrumbs from "./Breadcrumbs";

/** Simple layout for About and legal pages. */
export default function StaticPage({
  title,
  path,
  intro,
  updated,
  children,
}: {
  title: string;
  path: string;
  intro?: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="wrap">
      <article className="read legal">
        <header className="page-head">
          <Breadcrumbs items={[{ name: title, href: path }]} />
          <h1>{title}</h1>
          {intro && <p>{intro}</p>}
          {updated && <p className="muted">Last updated: {updated}</p>}
        </header>
        <hr className="stitch" />
        <div className="prose">{children}</div>
      </article>
    </div>
  );
}
