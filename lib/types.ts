/** A row of the "posts" table. */
export type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_url: string | null;
  cover_alt: string;
  category: string;
  tags: string[];
  content: string;
  difficulty: "beginner" | "easy" | "intermediate" | "experienced" | null;
  yarn: string;
  hook: string;
  gauge: string;
  finished_size: string;
  time_estimate: string;
  materials: string[];
  abbreviations: string;
  pattern: string;
  faq: FaqItem[];
  etsy_url: string;
  seo_title: string;
  seo_description: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** The smaller version used in lists and cards. */
export type PostSummary = Pick<
  Post,
  "id" | "slug" | "title" | "excerpt" | "cover_url" | "cover_alt" | "category" | "published_at" | "updated_at"
>;

export type FaqItem = { q: string; a: string };

export type Message = {
  id: string;
  name: string;
  email: string;
  body: string;
  created_at: string;
};
