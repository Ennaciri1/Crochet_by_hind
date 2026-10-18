import Link from "next/link";
import JsonLd from "./JsonLd";
import { absoluteUrl } from "@/lib/site";

type Crumb = { name: string; href: string };

/** Visible breadcrumbs + BreadcrumbList JSON-LD. The first crumb is always Home. */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ name: "Home", href: "/" }, ...items];
  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {all.map((c, i) => (
          <li key={c.href}>
            {i === all.length - 1 ? <span aria-current="page">{c.name}</span> : <Link href={c.href}>{c.name}</Link>}
          </li>
        ))}
      </ol>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.name,
            item: absoluteUrl(c.href),
          })),
        }}
      />
    </nav>
  );
}
