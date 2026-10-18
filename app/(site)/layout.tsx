import AdSenseScript from "@/components/AdSenseScript";
import Footer from "@/components/Footer";
import Header from "@/components/Header";

/** Layout of every PUBLIC page: header, footer and the AdSense script. */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <AdSenseScript />
    </>
  );
}
