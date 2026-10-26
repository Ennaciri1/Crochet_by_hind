import { Analytics } from "@vercel/analytics/next";
import AdSenseScript from "@/components/AdSenseScript";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getCategories } from "@/lib/categories";
import { getSiteSettings } from "@/lib/site";

/**
 * Layout of every PUBLIC page: header, footer, the AdSense script and visitor
 * statistics. <Analytics /> is Vercel Web Analytics: it counts visitors without
 * cookies (so no consent banner is needed for it) and only on public pages, so
 * the owner's own visits to /admin are never counted. Results: Vercel → project → Analytics.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [site, categories] = await Promise.all([getSiteSettings(), getCategories()]);
  return (
    <>
      <Header siteName={site.name} categories={categories} pinterest={site.pinterest} />
      <main id="main">{children}</main>
      <Footer site={site} categories={categories} />
      <AdSenseScript client={site.adsEnabled ? site.adsenseClient : ""} />
      <Analytics />
    </>
  );
}
