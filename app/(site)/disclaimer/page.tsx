import type { Metadata } from "next";
import StaticPage from "@/components/StaticPage";
import { renderMarkdown } from "@/lib/markdown";
import { getStaticPage } from "@/lib/pages";
import { getSiteSettings } from "@/lib/site";

// ISR, like the rest of the site: an edit made in /admin shows up within 5 minutes.
export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  return {
    title: "Disclaimer",
    description: `Advertising, affiliate and safety disclaimer for ${site.name}.`,
    alternates: { canonical: "/disclaimer" },
  };
}

export default async function DisclaimerPage() {
  const page = await getStaticPage("disclaimer");
  return (
    <StaticPage title={page.title} path="/disclaimer">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
    </StaticPage>
  );
}
