import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import { renderMarkdown } from "@/lib/markdown";
import { getStaticPage } from "@/lib/pages";
import { getSiteSettings } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: "About",
    description: `Meet ${site.author}, the crochet designer behind ${site.name}.`,
    alternates: { canonical: "/about" },
  };
}

export default async function AboutPage() {
  const page = await getStaticPage("about");
  return (
    <StaticPage title={page.title} path="/about">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
    </StaticPage>
  );
}
