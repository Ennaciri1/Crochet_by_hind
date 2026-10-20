import type { Metadata } from "next";
import Link from "next/link";
import { getStaticPage, type StaticPageSlug } from "@/lib/pages";

export const metadata: Metadata = { title: "Pages" };

const SLUGS: StaticPageSlug[] = ["about", "privacy-policy", "terms", "disclaimer"];

export default async function PagesListPage() {
  const pages = await Promise.all(SLUGS.map((slug) => getStaticPage(slug)));

  return (
    <>
      <div className="section-head" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Pages</h1>
      </div>
      <table className="admin-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>URL</th>
            <th>
              <span className="visually-hidden">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {pages.map((p) => (
            <tr key={p.slug}>
              <td data-label="Title">{p.title}</td>
              <td data-label="URL">/{p.slug}</td>
              <td>
                <Link href={`/admin/pages/${p.slug}`}>Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
