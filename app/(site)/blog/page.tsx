import type { Metadata } from "next";
import BlogListing, { blogMetadata } from "./listing";

/** /blog — page 1 of the blog index (all posts, newest first). */
export const revalidate = 300;

export function generateMetadata(): Promise<Metadata> {
  return blogMetadata(1);
}

export default function BlogPage() {
  return <BlogListing page={1} />;
}
