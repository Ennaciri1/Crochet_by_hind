import type { Metadata } from "next";
import Link from "next/link";
import { getCategories } from "@/lib/categories";
import ImportForm from "./ImportForm";

export const metadata: Metadata = { title: "Import" };

export default async function ImportPage() {
  const categories = await getCategories();

  return (
    <>
      <div className="section-head">
        <div>
          <h1>Bulk import</h1>
          <p className="page-sub">
            Create many posts at once from an Excel file and a folder of photos — no need to fill the post form by
            hand for every pattern.
          </p>
        </div>
        <Link className="btn btn-small" href="/admin/posts">
          Back to posts
        </Link>
      </div>

      <ImportForm categories={categories} />
    </>
  );
}
