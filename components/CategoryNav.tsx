import Link from "next/link";
import YarnBall from "./YarnBall";
import { categories, yarnVars } from "@/lib/categories";

/** Small colored category buttons, each with its own yarn ball. */
export function CategoryPills({ current }: { current?: string }) {
  return (
    <ul className="category-pills" aria-label="Categories">
      {categories.map((c) => (
        <li key={c.slug}>
          <Link
            href={`/category/${c.slug}`}
            style={yarnVars(c.color)}
            aria-current={c.slug === current ? "page" : undefined}
          >
            <YarnBall color="var(--c)" size={20} tail={false} />
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Big colored tiles for the homepage: one yarn ball per category. */
export function CategoryTiles() {
  return (
    <ul className="category-tiles" aria-label="Categories">
      {categories.map((c) => (
        <li key={c.slug} style={yarnVars(c.color)}>
          <Link href={`/category/${c.slug}`}>
            <YarnBall color="var(--c)" size={76} />
            <span>{c.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
