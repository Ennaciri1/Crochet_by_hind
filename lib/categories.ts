/** The 5 blog categories. The slug is stored in the database; each has its own yarn color. */
export const categories = [
  {
    slug: "free-patterns",
    color: "rose", // cotton yarn color (see --yarn-rose in globals.css)
    name: "Free patterns",
    description: "Free crochet patterns with clear US-term instructions, stitch counts and printable pattern cards.",
  },
  {
    slug: "amigurumi",
    color: "butter", // cotton yarn color (see --yarn-butter in globals.css)
    name: "Amigurumi",
    description: "Free amigurumi patterns: small crocheted animals, dolls and toys, worked in the round.",
  },
  {
    slug: "wearables",
    color: "lilac", // cotton yarn color (see --yarn-lilac in globals.css)
    name: "Wearables",
    description: "Free crochet patterns for hats, scarves, sweaters, bags and other things you can wear.",
  },
  {
    slug: "home-decor",
    color: "mint", // cotton yarn color (see --yarn-mint in globals.css)
    name: "Home decor",
    description: "Free crochet patterns for blankets, pillows, coasters, baskets and cozy home accents.",
  },
  {
    slug: "tutorials",
    color: "sky", // cotton yarn color (see --yarn-sky in globals.css)
    name: "Tutorials",
    description: "Step-by-step crochet tutorials: stitches, techniques, reading patterns and finishing tips.",
  },
] as const;

export type CategorySlug = (typeof categories)[number]["slug"];

export function getCategory(slug: string | null | undefined) {
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
