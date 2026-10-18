import type { Metadata } from "next";
import PostEditor from "../PostEditor";

export const metadata: Metadata = { title: "New post" };

export default function NewPostPage() {
  return <PostEditor />;
}
