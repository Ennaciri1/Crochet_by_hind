import Link from "next/link";
import CoverImage from "./CoverImage";
import { getCategory } from "@/lib/categories";
import { QUALITY_PHOTO } from "@/lib/images";
import type { PostSummary } from "@/lib/types";

/**
 * Widths the card thumbnail actually occupies, so a phone downloads a ~170px
 * image instead of a desktop-sized one. Must stay in step with the .post-grid
 * breakpoints in globals.css (1 column under 360px, 2 up to 1023px, then 3).
 */
const CARD_SIZES = "(max-width: 359px) 92vw, (max-width: 1023px) 47vw, 380px";

export default async function PostCard({ post, priority = false }: { post: PostSummary; priority?: boolean }) {
  const category = await getCategory(post.category);
  return (
    <article className="card">
      <Link className="card-link" href={`/blog/${post.slug}`}>
        <div className="media">
          <CoverImage
            src={post.cover_url}
            alt={post.cover_alt || post.title}
            sizes={CARD_SIZES}
            quality={QUALITY_PHOTO}
            priority={priority}
          />
        </div>
        <div className="card-body">
          {category && <span className="card-cat">{category.name}</span>}
          <h3>{post.title}</h3>
          {post.excerpt && <p>{post.excerpt}</p>}
        </div>
      </Link>
    </article>
  );
}

export function PostGrid({ posts }: { posts: PostSummary[] }) {
  return (
    <ul className="post-grid">
      {posts.map((post, i) => (
        <li key={post.id}>
          {/* The first two cards are usually above the fold, so they load eagerly. */}
          <PostCard post={post} priority={i < 2} />
        </li>
      ))}
    </ul>
  );
}
