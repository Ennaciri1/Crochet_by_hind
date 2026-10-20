import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStaticPage, type StaticPageSlug } from "@/lib/pages";
import PageForm from "./PageForm";

export const metadata: Metadata = { title: "Edit page" };

const VALID_SLUGS: StaticPageSlug[] = ["about", "privacy-policy", "terms", "disclaimer"];

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string }>;
};

export default async function EditStaticPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { saved } = await searchParams;
  if (!VALID_SLUGS.includes(slug as StaticPageSlug)) notFound();

  const page = await getStaticPage(slug as StaticPageSlug);

  return (
    <>
      <div className="section-head" style={{ marginTop: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Edit page</h1>
        <a href={`/${page.slug}`} target="_blank" rel="noopener">
          View page ↗
        </a>
      </div>
      {saved && <p className="notice notice-ok">Page saved.</p>}
      <PageForm page={page} />
    </>
  );
}
