import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/categories";
import CategoryForm from "./CategoryForm";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.id === id);
  if (!category) notFound();

  return (
    <>
      <div className="section-head" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Edit category</h1>
      </div>
      <CategoryForm category={category} />
    </>
  );
}
