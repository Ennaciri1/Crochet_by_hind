import Link from "next/link";
import CoverImage from "./CoverImage";
import { getCategory, yarnVars } from "@/lib/categories";
import type { PostSummary } from "@/lib/types";

export default async function PostCard({ post, priority = false }: { post: PostSummary; priority?: boolean }) {
  const category = await getCategory(post.category);
  return (
    <article className="card" style={yarnVars(category?.color)}>
      <div className="media">
        <CoverImage
          src={post.cover_url}
          alt={post.cover_alt || post.title}
          sizes="(max-width: 600px) 100vw, (max-width: 1000px) 50vw, 300px"
          priority={priority}
        />
      </div>
      {category && <span className="chip">{category.name}</span>}
      <h3>
        <Link href={`/blog/${post.slug}`}>{post.title}</Link>
      </h3>
      <p>{post.excerpt}</p>
    </article>
  );
}

export function PostGrid({ posts }: { posts: PostSummary[] }) {
  return (
    <ul className="post-grid">
      {posts.map((post, i) => (
        <li key={post.id}>
          <PostCard post={post} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}
