import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories } from "@/lib/categories";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Post } from "@/lib/types";
import PostEditor from "../PostEditor";

export const metadata: Metadata = { title: "Edit post" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditPostPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { saved } = await searchParams;

  const supabase = await createSupabaseServerClient();
  const [{ data }, categories] = await Promise.all([
    supabase.from("posts").select("*").eq("id", id).maybeSingle(),
    getCategories(),
  ]);
  if (!data) notFound();

  // key: re-mount the editor after each save so it shows the fresh data
  return <PostEditor key={(data as Post).updated_at} post={data as Post} saved={saved} categories={categories} />;
}
