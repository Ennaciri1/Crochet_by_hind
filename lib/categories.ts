import { cache } from "react";
import { getPublicClient } from "./supabase/public";

export type Category = {
  id?: string;
  slug: string;
  color: string;
  name: string;
  description: string;
  sort_order?: number;
};

/** Fallback list, used when the DB table is empty/unavailable (e.g. before running schema.sql). */
const fallbackCategories: Category[] = [
  {
    slug: "free-patterns",
    color: "rose",
    name: "Free patterns",
    description: "Free crochet patterns with step-by-step photos, stitch counts and clear US terms: granny square cardigans, bucket hats, ornaments and coasters.",
  },
  {
    slug: "amigurumi",
    color: "butter",
    name: "Amigurumi",
    description: "Cute amigurumi crochet patterns, from a Christmas gingerbread man to a giant strawberry plush. Easy, worked in the round, with printable PDF patterns.",
  },
  {
    slug: "wearables",
    color: "lilac",
    name: "Wearables",
    description: "Crochet patterns and ideas for things you can wear: granny square cardigans, hexagon cardigans and summer mesh hats, in clear US terms.",
  },
  {
    slug: "home-decor",
    color: "mint",
    name: "Home decor",
    description: "Crochet home decor patterns: chunky storage baskets with handles, Christmas garlands and ornaments, with easy printable PDF patterns.",
  },
  {
    slug: "tutorials",
    color: "sky",
    name: "Tutorials",
    description: "Crochet tutorials for beginners: how to read a pattern, a hook size chart, US vs UK terms and more step-by-step guides.",
  },
];

/** The blog categories, editable from /admin/categories. Cached per-request. */
export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = getPublicClient();
  if (!supabase) return fallbackCategories;

  const { data } = await supabase.from("categories").select("*").order("sort_order", { ascending: true });
  if (!data || data.length === 0) return fallbackCategories;
  return data as Category[];
});

export async function getCategory(slug: string | null | undefined) {
  const categories = await getCategories();
  return categories.find((c) => c.slug === slug);
}

/**
 * What each category is called in Google and in its page heading. The menu keeps
 * the short name set in /admin ("Wearables"), which nobody searches for.
 */
const searchHeadings: Record<string, string> = {
  "free-patterns": "Free Crochet Patterns",
  amigurumi: "Amigurumi Crochet Patterns",
  wearables: "Crochet Cardigan and Hat Patterns",
  "home-decor": "Crochet Home Decor Patterns",
  tutorials: "Crochet Tutorials for Beginners",
};

export function categoryHeading(category: Category) {
  return searchHeadings[category.slug] ?? `${category.name} Crochet Patterns`;
}

export const difficulties = ["beginner", "easy", "intermediate", "experienced"] as const;

/**
 * CSS variables for a yarn color: --c (the yarn) and --t (a light tint).
 * Usage: <div style={yarnVars("rose")}> then use var(--c) / var(--t) in CSS.
 */
export function yarnVars(color: string = "rose") {
  return { "--c": `var(--yarn-${color})`, "--t": `var(--tint-${color})` } as React.CSSProperties;
}
