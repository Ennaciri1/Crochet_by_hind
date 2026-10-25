import type { Metadata } from "next";
import BlogListing, { blogMetadata } from "./listing";

/** /blog — page 1 of the blog index (all posts, newest first). */
export const revalidate = 300;

export const metadata: Metadata = blogMetadata(1);

export default function BlogPage() {
  return <BlogListing page={1} />;
}
