import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import { renderMarkdown } from "@/lib/markdown";
import { getStaticPage } from "@/lib/pages";
import { getSiteSettings } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: "Terms of Use",
    description: `The rules for using ${site.name} and its free crochet patterns.`,
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const page = await getStaticPage("terms");
  return (
    <StaticPage title={page.title} path="/terms">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
    </StaticPage>
  );
}
