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
    title: "Privacy Policy",
    description: `How ${site.name} collects, uses and protects your data, including cookies used by Google AdSense.`,
    alternates: { canonical: "/privacy-policy" },
  };
}

export default async function PrivacyPage() {
  const page = await getStaticPage("privacy-policy");
  return (
    <StaticPage title={page.title} path="/privacy-policy">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }} />
    </StaticPage>
  );
}
