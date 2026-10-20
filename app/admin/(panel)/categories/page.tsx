import type { Metadata } from "next";
import Link from "next/link";
import { getCategories, yarnVars } from "@/lib/categories";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const categories = await getCategories();

  return (
    <>
      <div className="section-head" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Categories</h1>
      </div>

      {saved && <p className="notice notice-ok">Category saved.</p>}
      <p className="hint">
        Categories are fixed to these 5 (posts reference them by slug). You can rename, recolor and reorder them.
      </p>

      <table className="admin-table">
        <thead>
          <tr>
            <th>Color</th>
            <th>Name</th>
            <th>Description</th>
            <th>Order</th>
            <th>
              <span className="visually-hidden">Edit</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {categories.map((c) => (
            <tr key={c.slug}>
              <td data-label="Color">
                <span
                  style={{
                    ...yarnVars(c.color),
                    display: "inline-block",
                    width: "1.2rem",
                    height: "1.2rem",
                    borderRadius: "50%",
                    background: "var(--c)",
                  }}
                />
              </td>
              <td data-label="Name">{c.name}</td>
              <td data-label="Description">{c.description}</td>
              <td data-label="Order">{c.sort_order}</td>
              <td>
                <Link href={`/admin/categories/${c.id}`}>Edit</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
