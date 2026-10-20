import AdSenseScript from "@/components/AdSenseScript";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { getCategories } from "@/lib/categories";
import { getSiteSettings } from "@/lib/site";

/** Layout of every PUBLIC page: header, footer and the AdSense script. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [site, categories] = await Promise.all([getSiteSettings(), getCategories()]);
  return (
    <>
      <Header siteName={site.name} categories={categories} />
      <main id="main">{children}</main>
      <Footer site={site} categories={categories} />
      <AdSenseScript client={site.adsEnabled ? site.adsenseClient : ""} />
    </>
  );
}
