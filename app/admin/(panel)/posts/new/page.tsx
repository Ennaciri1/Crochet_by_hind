import type { Metadata } from "next";
import { getCategories } from "@/lib/categories";
import PostEditor from "../PostEditor";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  const categories = await getCategories();
  return <PostEditor categories={categories} />;
}
