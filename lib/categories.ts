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
    description: "Free crochet patterns with clear US-term instructions, stitch counts and printable pattern cards.",
  },
  {
    slug: "amigurumi",
    color: "butter",
    name: "Amigurumi",
    description: "Free amigurumi patterns: small crocheted animals, dolls and toys, worked in the round.",
  },
  {
    slug: "wearables",
    color: "lilac",
    name: "Wearables",
    description: "Free crochet patterns for hats, scarves, sweaters, bags and other things you can wear.",
  },
  {
    slug: "home-decor",
    color: "mint",
    name: "Home decor",
    description: "Free crochet patterns for blankets, pillows, coasters, baskets and cozy home accents.",
  },
  {
    slug: "tutorials",
    color: "sky",
    name: "Tutorials",
    description: "Step-by-step crochet tutorials: stitches, techniques, reading patterns and finishing tips.",
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

export const difficulties = ["beginner", "easy", "intermediate", "experienced"] as const;

/**
 * CSS variables for a yarn color: --c (the yarn) and --t (a light tint).
 * Usage: <div style={yarnVars("rose")}> then use var(--c) / var(--t) in CSS.
 */
export function yarnVars(color: string = "rose") {
  return { "--c": `var(--yarn-${color})`, "--t": `var(--tint-${color})` } as React.CSSProperties;
}
